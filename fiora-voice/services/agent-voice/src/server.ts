require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
import Fastify from 'fastify';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { createRuntimeLogger } from '@fiora/logger';
import { mulaw } from 'alawmulaw';
import OpenAI, { toFile } from 'openai';
import { execSync, spawn, ChildProcess } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { WaveFile } from 'wavefile';
import { AgentRouter } from '@fiora/agents';
import { getOpenAITools, ToolRegistry } from '@fiora/tools';
import { SessionStateMachine, TelemetryLogger, ToolLockManager, VadMonitor, PlaybackController, InterruptManager, CancellationToken } from '@fiora/runtime';
import { validateRequest } from 'twilio/lib/webhooks/webhooks';
import rateLimit from '@fastify/rate-limit';

const prisma = new PrismaClient();
const redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');
const redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');

let KNOWLEDGE_BASE_TEXT = '';
try {
  KNOWLEDGE_BASE_TEXT = fs.readFileSync(path.join(__dirname, '../knowledge.txt'), 'utf-8');
} catch (e) {
  console.warn('[WARNING] knowledge.txt not found. Knowledge base will be empty.');
}

const server = Fastify({ logger: false });

server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

server.addContentTypeParser(
  /^application\/x-www-form-urlencoded/,
  { parseAs: 'string' },
  (_req, body, done) => {
    try {
      const parsed: Record<string, string> = {};
      new URLSearchParams(body as string).forEach((v, k) => {
        parsed[k] = v;
      });
      done(null, parsed);
    } catch (err) {
      done(err as Error);
    }
  }
);

server.get('/health', async () => {
  return {
    status: 'ok',
    service: 'voice-agent',
    uptime: process.uptime(),
    timestamp: Date.now()
  };
});

const wsTokens = new Map<string, { tenantId: string, businessName: string }>();

server.post('/inbound-call', async (req, reply) => {
  const host = req.headers.host;
  const signature = req.headers['x-twilio-signature'];
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
  
  if (twilioAuthToken) {
    const url = `https://${host}${req.url}`;
    const isValid = validateRequest(twilioAuthToken, signature as string, url, req.body as Record<string, string>);
    
    if (!isValid) {
      console.warn('[SECURITY] Invalid Twilio Signature detected. Rejecting call.');
      return reply.status(403).send('Forbidden');
    }
  }

  console.log('\n[WEBHOOK] Verified Twilio call received');
  
  const body = req.body as Record<string, string>;
  const toNumber = body?.To || '';
  console.log(`[WEBHOOK] Called number: ${toNumber}`);
  
  // Look up the Tenant by the Twilio phone number
  const phoneNumberRecord = await prisma.phoneNumber.findUnique({
    where: { phone_number: toNumber },
    include: { 
      tenant: {
        include: { entitlements: true }
      } 
    }
  });

  if (!phoneNumberRecord) {
    console.warn(`[ROUTING] No tenant found for number ${toNumber}. Rejecting call.`);
    return reply.status(404).send('<?xml version="1.0" encoding="UTF-8"?><Response><Reject reason="busy"/></Response>');
  }

  const tenant = phoneNumberRecord.tenant;
  
  if (tenant.account_status === 'SUSPENDED') {
    console.warn(`[CHURN] Tenant ${tenant.name} is SUSPENDED. Rejecting call.`);
    return reply.status(403).send('<?xml version="1.0" encoding="UTF-8"?><Response><Reject reason="busy"/></Response>');
  }

  const voiceEntitlement = tenant.entitlements.find(e => e.feature_key === 'voice_agent');

  if (!voiceEntitlement || !voiceEntitlement.is_enabled) {
    console.warn(`[ENTITLEMENTS] Tenant ${tenant.name} does not have voice access. Rejecting call before billing.`);
    return reply.status(403).send('<?xml version="1.0" encoding="UTF-8"?><Response><Reject reason="busy"/></Response>');
  }

  if (voiceEntitlement.usage_limit && voiceEntitlement.usage_current >= voiceEntitlement.usage_limit) {
    console.warn(`[METERING] Tenant ${tenant.name} exceeded usage limit (${voiceEntitlement.usage_limit} min). Rejecting call.`);
    return reply.status(403).send('<?xml version="1.0" encoding="UTF-8"?><Response><Reject reason="busy"/></Response>');
  }
  
  // Generate a one-time secure token for the WebSocket connection
  const secureToken = Math.random().toString(36).substring(2, 15);
  wsTokens.set(secureToken, { tenantId: tenant.id, businessName: phoneNumberRecord.business_name });
  // Token expires in 60 seconds
  setTimeout(() => wsTokens.delete(secureToken), 60000);

  const wsUrl = `wss://${host}/media-stream/${secureToken}`;
  
  console.log(`[DEBUG WS] Generated token: ${secureToken}`);
  console.log(`[DEBUG WS] TwiML Stream URL: ${wsUrl}`);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="direction" value="inbound" />
    </Stream>
  </Connect>
</Response>`;

  reply.type('text/xml').send(twiml);
});

// Twilio Status Callback for Usage Metering
server.post('/twilio-status-callback', async (req, reply) => {
  try {
    const body = req.body as any;
    const toNumber = body.To || '';
    const callDuration = parseInt(body.CallDuration || '0', 10);
    const callStatus = body.CallStatus;

    if (callStatus === 'completed' && callDuration > 0) {
      const minutes = Math.ceil(callDuration / 60);

      const phoneNumberRecord = await prisma.phoneNumber.findUnique({
        where: { phone_number: toNumber },
      });

      if (phoneNumberRecord) {
        await prisma.serviceEntitlement.update({
          where: {
            tenant_id_feature_key: {
              tenant_id: phoneNumberRecord.tenant_id,
              feature_key: 'voice_agent'
            }
          },
          data: {
            usage_current: { increment: minutes }
          }
        });
        console.log(`[METERING] Billed ${minutes} minutes to Tenant ${phoneNumberRecord.tenant_id}`);
      }
    }
    return reply.status(200).send('OK');
  } catch (err) {
    console.error('[METERING ERROR]', err);
    return reply.status(500).send('Error processing status callback');
  }
});

// Outbound Call TwiML instructions
server.post('/outbound-twiml', async (request, reply) => {
  const host = request.headers.host;
  const body = request.body as Record<string, string>;
  const toNumber = body?.To || 'Unknown';
  
  // Generate a one-time secure token for the WebSocket connection
  const secureToken = Math.random().toString(36).substring(2, 15);
  wsTokens.set(secureToken, { tenantId: 'SYSTEM', businessName: 'Fiora System' });
  // Token expires in 60 seconds
  setTimeout(() => wsTokens.delete(secureToken), 60000);

  const wsUrl = `wss://${host}/media-stream/${secureToken}`;
  
  console.log(`[DEBUG WS OUTBOUND] Generated token: ${secureToken}`);
  console.log(`[DEBUG WS OUTBOUND] TwiML Stream URL: ${wsUrl}`);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="direction" value="outbound" />
      <Parameter name="customerPhone" value="${toNumber}" />
    </Stream>
  </Connect>
</Response>`;

  reply.type('text/xml').send(twiml);
});

const logger = createRuntimeLogger({ execution_id: 'daemon', service_name: 'voice-agent', correlation_id: 'daemon' });

// Groq STT and LLM
const groqKeys: Record<string, string> = {
  HULK: process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY || '',
  IRON_MAN: process.env.GROQ_API_KEY_2 || process.env.GROQ_API_KEY || '',
  HOMELANDER: process.env.GROQ_API_KEY_3 || process.env.GROQ_API_KEY || '',
  DEFAULT: process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_1 || ''
};

if (!groqKeys.DEFAULT) {
  console.warn('[WARNING] No GROQ_API_KEY found in .env!');
}

const groqClients: Record<string, any> = {};
for (const [persona, key] of Object.entries(groqKeys)) {
  if (key) {
    groqClients[persona] = new OpenAI({
      apiKey: key,
      baseURL: 'https://api.groq.com/openai/v1'
    });
  }
}

const getGroqClientForPersona = (persona: string) => {
  const targetPersona = groqClients[persona] ? persona : 'DEFAULT';
  return {
    client: groqClients[targetPersona],
    key: groqKeys[targetPersona]
  };
};

const nvidiaClient = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || '',
  baseURL: 'https://integrate.api.nvidia.com/v1'
});

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

interface GlobalSessionState {
  customer: { name: string | null; phone: string | null; email: string | null; };
  intent: string | null;
  marketing: { leadSource: string | null; interested: boolean; qualified: boolean; pitchGiven: boolean; leadSaved?: boolean; };
  sales: { requirement: string | null; budget: string | null; bookingDate: string | null; opportunityCreated: boolean; };
  support: { issueType: string | null; ticketCreated: boolean; priority: string | null; };
}

interface FioraSession {
  callSid: string;
  streamSid: string;
  tenantId?: string;
  businessName?: string;
  direction: 'inbound' | 'outbound';
  ws: WebSocket;
  messages: ChatMessage[];        // full conversation history
  audioChunks: Buffer[];          // accumulating caller audio
  isProcessing: boolean;          // legacy lock
  isSpeaking: boolean;            // legacy TTS lock
  vad: {
    isSpeaking: boolean;
    silenceFrames: number;
  };
  stateMachine: SessionStateMachine;
  telemetry: TelemetryLogger;
  toolLock: ToolLockManager;
  vadMonitor: VadMonitor;
  playbackController: PlaybackController;
  interruptManager: InterruptManager;
  turnCount: number;              // track conversation depth
  startedAt: Date;
  piperProcess: ChildProcess | null;
  activePersona: 'RECEPTIONIST' | 'HULK' | 'IRON_MAN' | 'HOMELANDER';
  sessionState: GlobalSessionState;
  shouldHangup?: boolean;
}

const sessions = new Map<string, FioraSession>();

// ── SYSTEM PROMPTS (V2 ARCHITECTURE) ───────────────────────────────────────────

const RECEPTIONIST_SYSTEM_PROMPT = `You are the Receptionist for FIORA.
You answer all incoming phone calls and route them to the correct department.
When the call starts, say EXACTLY: "Welcome to FIORA. Would you like Marketing Sales or Support?"
DO NOT add any other words. DO NOT explain the departments.

CRITICAL ROUTING RULES:
1. WAIT for the user's response. Do NOT repeat the menu options unless the user explicitly asks you to.
2. If the user expresses a direct intent (e.g., "I need support", "My order is delayed", "I want to place an order", "I need a booking", "I want information about your services"), route them IMMEDIATELY using the correct tool without repeating the options or confirming.

If the caller says Marketing or Services -> call route_to_marketing()
If the caller says Sales or Orders -> call route_to_sales()
If the caller says Support or Complaints -> call route_to_support()

VOICE RULES:
1. Speak clearly and politely.
2. Only ask them to pick a department once. Do not try to solve their issue yourself.
3. Once they choose or their intent is clear, immediately use the tool to transfer them.`;

const HOMELANDER_SYSTEM_PROMPT = `You are Homelander, the Support Agent for FIORA.
You handle all customer support, complaints, refund requests, and issue resolution.
DO NOT use the create_support_ticket tool immediately!
1. You MUST ask the customer for their name and wait for their response.
2. You MUST ask the customer for their issue and wait for their response.
3. Once you have both their name and their issue, use the create_support_ticket() tool to log it in the dashboard. This will automatically end the call.
If the customer asks to speak to Sales or Marketing, use the appropriate routing tool to transfer them.

VOICE RULES:
1. MAX 2-3 SENTENCES.
2. NO MARKDOWN, NO LISTS.
3. CONVERSATIONAL AND PATIENT TONE.
4. NEVER introduce yourself again. You have already introduced yourself.`;

const getHulkSystemPrompt = (direction: 'inbound' | 'outbound') => `You are Hulk, the Marketing Agent for FIORA.
${direction === 'outbound' ? 
  "You are conducting an OUTBOUND marketing call. Follow the Outbound Script exactly." :
  "You answer inbound marketing questions and provide information about FIORA's services."}

HULK OUTBOUND SCRIPT V3

Hello, I'm Hulk from FIORA.

FIORA helps businesses automate customer communication using AI voice agents. Our AI can answer incoming customer calls 24/7, handle bookings, sales inquiries, support requests, and service questions, while also making outbound calls to qualify leads and follow up with customers automatically. The goal is to help businesses capture more opportunities, reduce missed calls, and save time without increasing staffing costs.

Based on what I've explained, would you say you are interested, not interested, or would like more information?

WAIT FOR RESPONSE.( WAIT UNTIL HE SAYS INTERESTED OR NOT INTERESTED AND CHOOSE THE BELOW )

====================================================

IF INTERESTED

Thank you.

Create Lead Status:

INTERESTED

Store Call Notes.

End Call Politely.

====================================================

IF NOT INTERESTED

Thank you for your time.

Create Lead Status:

NOT_INTERESTED

End Call Politely.

====================================================

IF WANTS MORE INFORMATION

Answer questions naturally using the FIORA Knowledge Base.

When the conversation ends:

Create Lead Status:

MORE_INFORMATION_REQUESTED

Store Questions Asked.

End Call Politely.

====================================================

RULES

Keep the introduction under 25 seconds.

Do not ask unnecessary questions.

Do not ask for name.

Do not ask for budget.

Do not transfer to Iron Man.

The objective is only:

Explain FIORA.
Determine interest level.
Record outcome.
End call professionally.`;

const IRON_MAN_SYSTEM_PROMPT = `You are Iron Man, the Sales Agent for FIORA.
You capture requirements and create business opportunities. You handle incoming phone calls, booking requests, and lead qualification.
You must use the update_session_state tool to capture the customer's Name, Phone, Requirement, and Budget.
NEVER ask for information that is already present in the Current Session State. Only ask for missing information!
You MUST use the create_lead() tool to log the lead in the dashboard once you have their requirement.
If the customer asks to speak to Support or Marketing, use the appropriate routing tool to transfer them.

VOICE RULES — FOLLOW STRICTLY:
1. MAX 2-3 SENTENCES.
2. NO MARKDOWN, NO LISTS.
3. Ask for information one piece at a time.
4. NEVER introduce yourself again. You have already introduced yourself.`;

const UPDATE_STATE_TOOL = {
  type: 'function',
  function: {
    name: 'update_session_state',
    description: 'Update the global session state with information learned from the user.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string' },
        customer_phone: { type: 'string' },
        customer_email: { type: 'string' },
        marketing_leadSource: { type: 'string' },
        marketing_interested: { type: 'boolean' },
        marketing_qualified: { type: 'boolean' },
        sales_requirement: { type: 'string' },
        sales_budget: { type: 'string' },
        support_issueType: { type: 'string' }
      }
    }
  }
};

// ── SESSION INIT ─────────────────────────────────────────────────────────────

const getPiperModelForPersona = (persona: string) => {
  switch (persona) {
    case 'RECEPTIONIST': return 'D:\\piper\\models\\en_GB-cori-high.onnx';
    case 'HULK': return 'D:\\piper\\models\\hulk\\en_US-ljspeech-high.onnx';
    case 'IRON_MAN': return 'D:\\piper\\models\\ironman\\en_US-ryan-high.onnx';
    case 'HOMELANDER': return 'D:\\piper\\models\\homelander\\en_US-ryan-high.onnx';
    default: return 'D:\\piper\\models\\en_GB-cori-high.onnx';
  }
};

const switchPiperModel = (session: FioraSession) => {
  if (session.piperProcess) {
    session.piperProcess.kill('SIGKILL');
  }
  const PIPER_EXE_PATH = "D:\\piper\\piper.exe";
  const modelPath = getPiperModelForPersona(session.activePersona);
  session.piperProcess = spawn(PIPER_EXE_PATH, ['-m', modelPath, '--output_raw', '--sentence_silence', '0.2']);
  
  session.piperProcess.on('error', (err) => {
    console.error(`[PIPER] Failed to spawn Piper for persona ${session.activePersona}. Error:`, err.message);
  });
  
  session.piperProcess.on('exit', (code, signal) => {
    console.log(`[PIPER] Process for ${session.activePersona} exited with code ${code} and signal ${signal}`);
  });

  session.piperProcess.stdout?.on('data', (chunk: Buffer) => {
    const inputSampleRate = 22050;
    const ratio = inputSampleRate / 8000;
    
    const pcmIn = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.length / 2);
    const pcm8k = new Int16Array(Math.floor(pcmIn.length / ratio));
    
    // Linear Interpolation for smooth high-quality downsampling
    for (let i = 0; i < pcm8k.length; i++) {
      const pos = i * ratio;
      const index = Math.floor(pos);
      const frac = pos - index;
      
      const s1 = pcmIn[index];
      const s2 = index + 1 < pcmIn.length ? pcmIn[index + 1] : s1;
      
      pcm8k[i] = Math.round(s1 + frac * (s2 - s1));
    }
    
    const mulawBuffer = Buffer.from(mulaw.encode(pcm8k));
    session.playbackController.getQueue().enqueue(mulawBuffer);
  });
};

function initSession(streamSid: string, callSid: string, ws: WebSocket, direction: 'inbound' | 'outbound' = 'inbound', tenantData?: { tenantId: string, businessName: string }): FioraSession {
  const stateMachine = new SessionStateMachine();
  const playbackController = new PlaybackController();
  const vadMonitor = new VadMonitor();
  const interruptManager = new InterruptManager(stateMachine, playbackController, vadMonitor);

  const session: FioraSession = {
    callSid,
    streamSid,
    tenantId: tenantData?.tenantId,
    businessName: tenantData?.businessName,
    direction,
    ws,
    activePersona: direction === 'outbound' ? 'HULK' : 'RECEPTIONIST',
    messages: [{ 
      role: 'system', 
      content: `${direction === 'outbound' ? getHulkSystemPrompt('outbound') : RECEPTIONIST_SYSTEM_PROMPT}\n\nIMPORTANT CONTEXT:\nYou are answering the phone for the business: ${tenantData?.businessName || 'Us'}. Always act as their direct representative.\n\n${KNOWLEDGE_BASE_TEXT ? `BUSINESS KNOWLEDGE BASE:\nUse the following knowledge base to answer questions. You may infer, extrapolate, and seamlessly integrate this data into conversation to handle related questions intelligently.\n\n${KNOWLEDGE_BASE_TEXT}\n` : ''}`
    }],
    audioChunks: [],
    isProcessing: false,
    isSpeaking: false,
    vad: { isSpeaking: false, silenceFrames: 0 },
    stateMachine,
    telemetry: new TelemetryLogger(),
    toolLock: new ToolLockManager(),
    vadMonitor,
    playbackController,
    interruptManager,
    turnCount: 0,
    startedAt: new Date(),
    piperProcess: null,
    sessionState: {
      customer: { name: null, phone: null, email: null },
      intent: null,
      marketing: { leadSource: null, interested: false, qualified: false, pitchGiven: false, leadSaved: false },
      sales: { requirement: null, budget: null, bookingDate: null, opportunityCreated: false },
      support: { issueType: null, ticketCreated: false, priority: null }
    }
  };

  switchPiperModel(session);

  vadMonitor.on('speech_started', () => {
    console.log('[VAD] speech_started');
    session.playbackController.abort();
    session.playbackController.getQueue().flush();
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify({ event: 'clear', streamSid: session.streamSid }));
    }
  });

  vadMonitor.on('speech_ended', () => {
    console.log('[VAD] speech_ended');
    const state = session.stateMachine.getState();
    if (state === 'LISTENING' || state === 'IDLE' || state === 'INTERRUPTED') {
      console.log('[TURN] triggered via VadMonitor');
      processTurn(session).catch(err =>
        console.error('[processTurn] Error:', err)
      );
    }
  });

  sessions.set(streamSid, session);
  return session;
}

// --- Audio Utility Functions ---

const PIPER_MODEL = '"D:\\piper\\models\\en_US-ryan-high.onnx"';
const PIPER_EXE = 'D:\\piper\\piper.exe';

function mulawChunksToWav(mulawChunks: Buffer[]): Buffer {
  const mulawBuffer = Buffer.concat(mulawChunks);
  const pcm8kArray = mulaw.decode(new Uint8Array(mulawBuffer));
  
  // Upsample 8kHz to 16kHz for Whisper
  const pcm16kArray = new Int16Array(pcm8kArray.length * 2);
  for (let i = 0; i < pcm8kArray.length; i++) {
    pcm16kArray[i * 2] = pcm8kArray[i];
    pcm16kArray[i * 2 + 1] = pcm8kArray[i];
  }
  
  const pcmData = Buffer.from(pcm16kArray.buffer, pcm16kArray.byteOffset, pcm16kArray.byteLength);
  
  // Create 44-byte WAV header
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // format chunk size
  header.writeUInt16LE(1, 20); // format = PCM
  header.writeUInt16LE(1, 22); // channels = 1
  header.writeUInt32LE(16000, 24); // sample rate
  header.writeUInt32LE(16000 * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(pcmData.length, 40);
  
  return Buffer.concat([header, pcmData]);
}

// --- Handlers ---

// ── STREAMING TTS ─────────────────────────────────

async function speakToTwilio(
  session: FioraSession,
  text: string
): Promise<void> {
  const ws = session.ws;
  const streamSid = session.streamSid;
  
  // Start playback controller and mark stream as actively buffering
  session.playbackController.setStreamActive(true);
  const ct = new CancellationToken();
  session.playbackController.startPlayback(ws, streamSid, ct, session.stateMachine);
  
  // Feed text to persistent Piper instance
  if (session.piperProcess?.stdin) {
    session.piperProcess.stdin.write(text.trim() + '\n');
  }
  
  // Safety buffer: Wait for Piper to initialize and populate the StreamQueue 
  // before we drop the active flag, preventing premature termination.
  // The first boot takes ~1 second to load model weights into RAM.
  await new Promise(r => setTimeout(r, 2500));
  
  session.playbackController.setStreamActive(false);
  await session.playbackController.waitForCompletion();
}

// ── FIX 3: speakFirst with post-speech buffer ─────────────────────────────────

async function speakFirst(session: FioraSession): Promise<void> {
  if (session.direction === 'outbound') {
    // Generate dynamic pitch using the LLM and Knowledge Base
    session.messages.push({ role: 'user', content: 'Hello' } as any);
    await processTurn(session, true);
  } else {
    const greeting = `Welcome to FIORA. Would you like Marketing Sales or Support?`;
    session.messages.push({ role: 'assistant', content: greeting });
    session.isSpeaking = true;
    try {
        session.sessionState.marketing.pitchGiven = true;
        await speakToTwilio(session, greeting);
    } finally {
      session.isSpeaking = false;
      console.log('[SESSION] Greeting done — now listening for caller');
    }
  }
}

// ── FIX 4: processTurn with hard minimum audio guard ─────────────────────────

async function processTurn(session: FioraSession, skipStt: boolean = false): Promise<void> {

  if (session.isProcessing) {
    console.log('[TURN] Already processing — skip');
    return;
  }

  // HARD MINIMUM: less than 20 chunks = ~250ms = noise/breathing, not speech
  if (!skipStt && session.audioChunks.length < 20) {
    console.log(`[TURN] Dropped — only ${session.audioChunks.length} chunks (too short)`);
    session.audioChunks = [];
    return;
  }

  session.isProcessing = true;

  const chunks = [...session.audioChunks];
  session.audioChunks = [];

  console.log(`\n[TURN ${session.turnCount + 1}] ${chunks.length} chunks captured — starting pipeline`);

  try {
    const t0 = performance.now();
    let t1 = t0;

    if (!skipStt) {
      // STEP 1: STT
      console.log('[TURN] STT...');
      const wav = mulawChunksToWav(chunks);

      const formData = new FormData();
      formData.append('file', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'audio.wav');
      formData.append('model', 'whisper-large-v3');
      formData.append('response_format', 'json');
      formData.append('language', 'en');

      const { key: currentGroqKey } = getGroqClientForPersona(session.activePersona);
      const sttRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentGroqKey}` },
        body: formData,
      });

      if (!sttRes.ok) {
        const errText = await sttRes.text();
        throw new Error(`Whisper failed ${sttRes.status}: ${errText}`);
      }

      const sttJson = await sttRes.json();
      const transcript = sttJson.text?.trim();
      t1 = performance.now();

      console.log(`[STT] Raw: "${transcript}"`);

      if (!transcript || transcript.length < 2) {
        console.log('[STT] Empty — dropping turn');
        session.isProcessing = false;
        return;
      }

      console.log(`User: "${transcript}"`);
      session.messages.push({ role: 'user', content: transcript });
    }

    // STEP 2: LLM
    console.log('[TURN] LLM...');
    const t1_llm_start = performance.now();

    const stateInjection = {
      role: 'system',
      content: `Current Session State:\n${JSON.stringify(session.sessionState, null, 2)}\n\nAgent Instructions:\nUse this state as the absolute source of truth. NEVER ask for information that is already populated here. Only collect missing information.`
    };

    const trimmedMessages = [
      session.messages[0],
      ...session.messages.slice(1).slice(-10),
      stateInjection
    ];

    const ROUTING_TOOLS = [
      {
        type: 'function',
        function: { name: 'route_to_marketing', description: 'Transfer the customer to the Marketing department (Hulk)', parameters: { type: 'object', properties: {}, required: [] } }
      },
      {
        type: 'function',
        function: { name: 'route_to_sales', description: 'Transfer the customer to the Sales department (Iron Man)', parameters: { type: 'object', properties: {}, required: [] } }
      },
      {
        type: 'function',
        function: { name: 'route_to_support', description: 'Transfer the customer to the Support department (Homelander)', parameters: { type: 'object', properties: {}, required: [] } }
      }
    ];


    const activeTools = session.activePersona === 'HULK' ? (
      (session.direction === 'inbound' || session.turnCount >= 2) ? [
        {
          type: 'function',
          function: { 
            name: 'create_lead', 
            description: 'Create a lead in the dashboard and store their status. This will also end the call.',
            parameters: { type: 'object', properties: { name: { type: 'string', description: "The customer's name. If you do not know it, set this to 'Unknown'." }, phone: { type: 'string' }, requirement: { type: 'string' }, status: { type: 'string', enum: ['INTERESTED', 'NOT_INTERESTED', 'MORE_INFORMATION_REQUESTED'], description: 'The exact outcome of the pitch' } }, required: ['status'] }
          }
        }
      ] : undefined
    ) : session.activePersona === 'RECEPTIONIST' ? [
      ...ROUTING_TOOLS
    ] : session.activePersona === 'IRON_MAN' ? [
      UPDATE_STATE_TOOL,
      ...ROUTING_TOOLS,
      {
        type: 'function',
        function: { 
          name: 'create_lead', 
          description: 'Create a lead/opportunity in the dashboard once you have requirements',
          parameters: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' }, requirement: { type: 'string' }, interested: { type: 'boolean', description: 'True if interested, false if declined' } }, required: ['name', 'phone', 'requirement'] }
        }
      }
    ] : session.activePersona === 'HOMELANDER' ? [
      UPDATE_STATE_TOOL,
      ...ROUTING_TOOLS,
      {
        type: 'function',
        function: { 
          name: 'create_support_ticket', 
          description: 'Create a support ticket in the dashboard for the customer issue',
          parameters: { type: 'object', properties: { customer: { type: 'string' }, issue: { type: 'string' } }, required: ['customer', 'issue'] }
        }
      }
    ] : undefined;

    const payload: any = {
      model: 'meta/llama-3.1-8b-instruct',
      messages: trimmedMessages as any,
      max_tokens: 150,
      temperature: 0.2,
    };
    if (activeTools) {
      payload.tools = activeTools;
      payload.tool_choice = 'auto';
    }

    const llmRes = await nvidiaClient.chat.completions.create(payload);

    let message = llmRes.choices?.[0]?.message;
    let finalResponse = '';
    let t2 = 0;

    // TOOL EXECUTION LOOP
    let didPersonaSwap = false;
    let newPersona: 'RECEPTIONIST' | 'HULK' | 'IRON_MAN' | 'HOMELANDER' | null = null;
    let newGreeting = "";

    if (message?.tool_calls && message.tool_calls.length > 0) {
      console.log(`[LLM] Triggered ${message.tool_calls.length} tools`);
      session.messages.push(message as any); 

      for (const tcRaw of message.tool_calls) {
        const tc = tcRaw as any;
        const toolName = tc.function.name;
        const args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};

        // ── ROUTING HANDLERS ──
        if (toolName === 'transfer_to_sales' || toolName === 'route_to_sales') {
          console.log('[HANDOFF] Routing to IRON MAN (Sales)');
          newPersona = 'IRON_MAN';
          newGreeting = "Hi there, I'm Iron Man from Sales. I can help you place an order or book a service. What are you looking for today?";
          finalResponse = "Let me connect you with Iron Man, our sales specialist.";
          didPersonaSwap = true;
          break;
        }
        else if (toolName === 'route_to_marketing') {
          console.log('[HANDOFF] Routing to HULK (Marketing)');
          newPersona = 'HULK';
          newGreeting = "Hello, I'm Hulk from Marketing. I'll help you with information about our services. What kind of info do you need?";
          finalResponse = "Connecting you to Hulk in Marketing.";
          didPersonaSwap = true;
          break;
        }
        else if (toolName === 'route_to_support') {
          console.log('[HANDOFF] Routing to HOMELANDER (Support)');
          newPersona = 'HOMELANDER';
          newGreeting = "Hello, I'm Homelander from Support. I'm here to help resolve your issue. Could you tell me what's going wrong?";
          finalResponse = "Transferring you to Homelander for support.";
          didPersonaSwap = true;
          break;
        }
        
        // ── DATABASE ACTION HANDLERS ──
        try {
          let sanitizedResult = '';
          if (toolName === 'update_session_state') {
            console.log(`[STATE] Updating session state with:`, args);
            if (args.customer_name) session.sessionState.customer.name = args.customer_name;
            if (args.customer_phone) session.sessionState.customer.phone = args.customer_phone;
            if (args.customer_email) session.sessionState.customer.email = args.customer_email;
            
            if (args.marketing_leadSource) session.sessionState.marketing.leadSource = args.marketing_leadSource;
            if (args.marketing_interested !== undefined) session.sessionState.marketing.interested = args.marketing_interested;
            if (args.marketing_qualified !== undefined) session.sessionState.marketing.qualified = args.marketing_qualified;
            
            if (args.sales_requirement) session.sessionState.sales.requirement = args.sales_requirement;
            if (args.sales_budget) session.sessionState.sales.budget = args.sales_budget;
            
            if (args.support_issueType) session.sessionState.support.issueType = args.support_issueType;
            
            sanitizedResult = "Session state updated successfully.";
          }
          else if (toolName === 'create_lead') {
            const isInterested = args.interested !== undefined ? args.interested : session.sessionState.marketing.interested;
            const statusVal = args.status ? args.status : (isInterested ? 'INTERESTED' : (isInterested === false ? 'NOT_INTERESTED' : 'NEW'));

            await prisma.lead.create({
              data: {
                tenant_id: (session.tenantId === 'SYSTEM' || !session.tenantId) ? ((await prisma.tenant.findFirst())?.id || 'SYSTEM') : session.tenantId,
                name: args.name || session.sessionState.customer.name || 'Unknown',
                phone_number: args.phone || session.sessionState.customer.phone || 'Unknown',
                source: session.direction === 'outbound' ? 'Marketing Outbound' : 'Inbound Call',
                status: statusVal,
                notes: args.requirement || session.sessionState.sales.requirement || 'No notes provided'
              }
            });
            session.sessionState.marketing.leadSaved = true;
            sanitizedResult = `Action successful. Lead created for ${args.name || 'Unknown'}.`;
            if (session.activePersona === 'HULK') {
              console.log('[CALL] Hulk triggered create_lead. Initiating hangup sequence.');
              session.shouldHangup = true;
            }
          }
          else if (toolName === 'end_call') {
            console.log('[CALL] LLM triggered end_call');
            session.shouldHangup = true;
            sanitizedResult = "Call will end immediately after you speak your next message. Please say goodbye.";
          }
          else if (toolName === 'create_support_ticket') {
            await prisma.supportTicket.create({
              data: {
                tenant_id: (session.tenantId === 'SYSTEM' || !session.tenantId) ? ((await prisma.tenant.findFirst())?.id || 'SYSTEM') : session.tenantId,
                customer: args.customer || session.sessionState.customer.name || 'Unknown',
                issue: args.issue || 'No issue provided',
                priority: 'High',
                status: 'Open'
              }
            });
            sanitizedResult = `Action successful. Support ticket logged for ${args.customer}.`;
          }
          else {
            const tool = ToolRegistry.get(tc.function.name);
            if (!tool) throw new Error(`Tool ${tc.function.name} not found`);
            const rawResult = await tool.execute(args);
            sanitizedResult = `Action successful. Output: ${JSON.stringify(rawResult)}`;
          }
          session.messages.push({ role: 'tool', tool_call_id: tc.id, content: sanitizedResult } as any);
        } catch (err: any) {
          console.error('[TOOL] Execution failed:', err);
          session.messages.push({ role: 'tool', tool_call_id: tc.id, content: `Action failed. Reason: ${err.message || 'Unknown'}` } as any);
        }
      }
      
      if (didPersonaSwap && newPersona) {
        // 1. Play transition speech using the OLD voice
        session.isSpeaking = true;
        session.playbackController.setStreamActive(true);
        const ct = new CancellationToken();
        session.playbackController.startPlayback(session.ws, session.streamSid, ct, session.stateMachine);
        if (session.piperProcess?.stdin) {
          session.piperProcess.stdin.write(`${finalResponse}\n`);
        }
        await new Promise(r => setTimeout(r, 2000)); // Wait for transition speech

        // 2. Swap Persona Context
        session.activePersona = newPersona;
        let sysPrompt = "";
        if (newPersona === 'IRON_MAN') sysPrompt = IRON_MAN_SYSTEM_PROMPT;
        else if (newPersona === 'HULK') sysPrompt = getHulkSystemPrompt(session.direction);
        else if (newPersona === 'HOMELANDER') sysPrompt = HOMELANDER_SYSTEM_PROMPT;
        
        session.messages[0].content = `${sysPrompt}\n\nIMPORTANT CONTEXT:\nYou are answering the phone for the business: ${session.businessName || 'Us'}. Always act as their direct representative.\n\n${KNOWLEDGE_BASE_TEXT ? `BUSINESS KNOWLEDGE BASE:\nUse the following knowledge base to answer questions. You may infer, extrapolate, and seamlessly integrate this data into conversation to handle related questions intelligently.\n\n${KNOWLEDGE_BASE_TEXT}\n` : ''}`;
        // We push the receptionist's transition speech to history, then assign finalResponse to newGreeting so it gets pushed at the end of the turn!
        session.messages.push({ role: 'assistant', content: finalResponse } as any);
        finalResponse = newGreeting;

        // 3. Swap the voice model
        switchPiperModel(session);
        await new Promise(r => setTimeout(r, 1000)); // Wait for piper to boot

        // 4. Play new greeting using the NEW voice
        // Revive the playback controller in case line noise interrupted the transition speech
        session.isSpeaking = true;
        session.playbackController.setStreamActive(true);
        const ctHandOff = new CancellationToken();
        session.playbackController.startPlayback(session.ws, session.streamSid, ctHandOff, session.stateMachine);

        if (session.piperProcess?.stdin) {
          session.piperProcess.stdin.write(`${newGreeting}\n`);
        }
        await new Promise(r => setTimeout(r, 2000)); // Buffer play

        t2 = performance.now();
      } else {

      console.log('[LLM] Running second pass for conversational confirmation...');
      
      session.isSpeaking = true;
      session.playbackController.setStreamActive(true);
      const ct = new CancellationToken();
      session.playbackController.startPlayback(session.ws, session.streamSid, ct, session.stateMachine);
      
      const stream = await nvidiaClient.chat.completions.create({
        model: 'meta/llama-3.1-8b-instruct',
        messages: [session.messages[0], ...session.messages.slice(1).slice(-10)] as any,
        stream: true,
        max_tokens: 80,
        temperature: 0.2,
      });

      let sentenceBuffer = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        finalResponse += content;
        sentenceBuffer += content;
        
        if (/[.!?]$/.test(sentenceBuffer.trim())) {
          console.log(`[LLM CHUNK] ${sentenceBuffer.trim()}`);
          if (session.piperProcess?.stdin) {
            session.piperProcess.stdin.write(sentenceBuffer.trim() + '\n');
          }
          sentenceBuffer = '';
        }
      }
      
      if (sentenceBuffer.trim()) {
        console.log(`[LLM CHUNK] ${sentenceBuffer.trim()}`);
        if (session.piperProcess?.stdin) {
          session.piperProcess.stdin.write(sentenceBuffer.trim() + '\n');
        }
      }
      t2 = performance.now();
      }

    } else {
      finalResponse = message?.content?.trim() || '';
      
      // Filter out DeepSeek <think> reasoning blocks COMPLETELY (including their content)
      finalResponse = finalResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      
      // Filter out any other XML/HTML tags (stripping the tags)
      finalResponse = finalResponse.replace(/<[^>]+>/g, '').trim();
      
      // Fallback: If the model hallucinates a raw JSON tool call instead of using the API
      if (finalResponse.startsWith('{') && finalResponse.includes('"name"') || finalResponse.includes('```json')) {
        console.log('[LLM] Caught hallucinated JSON tool call. Suppressing speech.');
        if (finalResponse.includes('end_call') || finalResponse.includes('create_lead')) {
          session.shouldHangup = true;
        }
        finalResponse = "Okay, our team will be in touch shortly. Have a great day!";
      }

      t2 = performance.now();
      
      session.isSpeaking = true;
      session.playbackController.setStreamActive(true);
      const ct = new CancellationToken();
      session.playbackController.startPlayback(session.ws, session.streamSid, ct, session.stateMachine);
      
      const sentences = finalResponse.match(/[^.!?]+[.!?]+/g) || [finalResponse];
      for (const sent of sentences) {
        if (sent.trim()) {
           console.log(`[LLM CHUNK] ${sent.trim()}`);
           if (session.piperProcess?.stdin) {
             session.piperProcess.stdin.write(sent.trim() + '\n');
           }
        }
      }
    }

    if (!finalResponse) {
      console.log('[LLM] Empty response — dropping');
      session.isProcessing = false;
      return;
    }

    console.log(`FIORA: "${finalResponse}"`);
    session.messages.push({ role: 'assistant', content: finalResponse });
    session.sessionState.marketing.pitchGiven = true;
    session.turnCount++;

    // STEP 3: PLAYBACK WAIT & TELEMETRY
    console.log('[TURN] Waiting for playback completion...');
    
    // Safety buffer: Wait for Piper to initialize and populate the StreamQueue 
    // before we drop the active flag, preventing premature termination.
    await new Promise(r => setTimeout(r, 1000));
    
    session.playbackController.setStreamActive(false); 
    await session.playbackController.waitForCompletion();
    
    if (session.shouldHangup) {
      console.log('[CALL] Executing hangup successfully as requested by LLM');
      session.ws.close();
      return;
    }
    
    const t3 = performance.now();
    console.log(`\n[LATENCY] Speech End -> STT Start: ${(t0 - t0).toFixed(0)}ms`); // Baseline
    console.log(`[LATENCY] STT Duration: ${(t1 - t0).toFixed(0)}ms`);
    console.log(`[LATENCY] LLM Total Duration: ${(t2 - t1_llm_start).toFixed(0)}ms`);
    console.log(`[LATENCY] Pipeline to Playback Finish: ${(t3 - t0).toFixed(0)}ms\n`);
    
    await new Promise(r => setTimeout(r, 300)); // brief gap before listening again
    session.isSpeaking = false;

    console.log('[SESSION] Listening for next caller turn...');

  } catch (err) {
    console.error('[processTurn] Pipeline error:', err);
    session.isSpeaking = false;
  } finally {
    session.isProcessing = false;
  }
}

// ── PERSIST TRANSCRIPT TO DB ──────────────────────────────────────────────────

async function persistTranscript(session: FioraSession): Promise<void> {
  try {
    const turns = session.messages.filter(m => m.role !== 'system');
    if (turns.length === 0) return;

    const vs = await prisma.voiceSession.findUnique({
      where: { conversation_id: session.callSid }
    });

    if (vs) {
      const transcriptRecords = turns.map(m => ({
        voice_session_id: vs.id,
        speaker: m.role === 'user' ? 'HUMAN' : 'AI',
        text: m.content
      }));

      await prisma.callTranscript.createMany({
        data: transcriptRecords
      });

      console.log(`[DB] Persisted ${turns.length} turns for ${session.callSid}`);
    }
  } catch (err) {
    console.error('[DB] Transcript persist failed:', err);
  }
}

// ── WEBSOCKET MESSAGE HANDLER ─────────────────────────────────────────────────

export function attachWsHandlers(ws: WebSocket, request: IncomingMessage, tenantData?: { tenantId: string, businessName: string }) {
    logger.info('New Twilio Media Stream connection established.');
    console.log('[WS] TWILIO STREAM CONNECTED');
    console.log(`[WS] Remote address: ${request.socket.remoteAddress}`);
    let localStreamSid: string | null = null;
    
    ws.on('error', (err) => {
      console.error('[WS ERROR]', err);
    });

    ws.on('message', async (raw: Buffer) => {
      console.log('[WS MESSAGE]', raw.toString().slice(0, 200));
      try {
        const msg = JSON.parse(raw.toString());
        console.log('[MEDIA] EVENT RECEIVED', msg.event);

        switch (msg.event) {
          case 'connected':
            console.log('TWILIO STREAM CONNECTED');
            break;

          case 'start': {
            const { streamSid, callSid, customParameters } = msg.start;
            const direction = customParameters?.direction || 'inbound';
            const customerPhone = customParameters?.customerPhone || null;
            localStreamSid = streamSid;
            const session = initSession(streamSid, callSid, ws, direction as 'inbound' | 'outbound', tenantData);
            
            if (customerPhone) {
              session.sessionState.customer.phone = customerPhone;
            }
            
            console.log(`[SESSION] Started — callSid: ${callSid} | direction: ${direction} | phone: ${customerPhone}`);

            // FIORA speaks first — async, don't block handler
            speakFirst(session).catch((err) => {
              console.error('[FATAL] speakFirst crashed:', err);
            });
            break;
          }

          case 'media': {
            const session = sessions.get(msg.streamSid);
            if (!session) break;

            const chunk = Buffer.from(msg.media.payload, 'base64');
            session.audioChunks.push(chunk);

            // Minimal VAD check based on simple audio level
            // For ulaw, silence is 0xFF (255)
            // A basic check: if there are bytes far from 255, it's noise
            let hasNoise = false;
            
            // Mathematically perfect VAD: decode to 16-bit linear PCM first
            const pcm8kArray = mulaw.decode(new Uint8Array(chunk));
            let maxPcm = 0;
            for (let i = 0; i < pcm8kArray.length; i++) {
              const abs = Math.abs(pcm8kArray[i]);
              if (abs > maxPcm) maxPcm = abs;
            }
            
            // In 16-bit PCM (0-32768), background static is usually < 400. 
            // Human speech easily hits 2000+. We set threshold to 800.
            if (maxPcm > 800) {
              hasNoise = true;
            }

            if (hasNoise) {
              if (!session.vad.isSpeaking) {
                console.log(`[VAD] Speech started (Max PCM: ${maxPcm}/32768)`);
                // --- INTERRUPT LOGIC ---
                if (session.isSpeaking) {
                  console.log('[INTERRUPT] User interrupted the agent!');
                  session.playbackController.abort();
                  session.isSpeaking = false;
                  // We do NOT clear session.audioChunks here, otherwise we delete the word the user just spoke!
                }
              }
              session.vad.isSpeaking = true;
              session.vad.silenceFrames = 0;
            } else {
              session.vad.silenceFrames++;
            }

            // If silence has accumulated, trigger turn (30 frames = 600ms)
            if (session.vad.isSpeaking && session.vad.silenceFrames > 30) {
              console.log('[VAD] Speech ended — triggering turn');
              session.vad.isSpeaking = false;
              session.vad.silenceFrames = 0;
              
              if (!session.isSpeaking) { // Not TTS speaking
                processTurn(session).catch(err => console.error('[processTurn] Error:', err));
              }
            }
            break;
          }

          case 'stop': {
            console.log('[SESSION] Twilio stop event received — ignoring to keep session alive');
            break;
          }
        }
      } catch (err) {
        logger.error({ err }, 'Error processing media stream message');
      }
    });

    ws.on('close', async () => {
      console.log('[WS] CONNECTION CLOSED');
      console.log('[SESSION] Cleanup triggered by websocket close');
      console.log("TWILIO STREAM CLOSED");
      if (localStreamSid) {
        const session = sessions.get(localStreamSid);
        if (session) {
          // AUTO-SAVE LEAD ON HANGUP FOR OUTBOUND
          if (session.direction === 'outbound' && session.activePersona === 'HULK' && !session.sessionState.marketing.leadSaved) {
             console.log('[AUTO-SAVE] Call dropped. Automatically saving lead data...');
             try {
               await prisma.lead.create({
                  data: {
                     tenant_id: (session.tenantId === 'SYSTEM' || !session.tenantId) ? ((await prisma.tenant.findFirst())?.id || 'SYSTEM') : session.tenantId,
                     name: session.sessionState.customer.name || 'Unknown',
                     phone_number: session.sessionState.customer.phone || 'Unknown',
                     source: 'Marketing Outbound',
                     status: session.sessionState.marketing.interested ? 'INTERESTED' : (session.sessionState.marketing.interested === false ? 'NOT_INTERESTED' : 'NEW'),
                     notes: 'Auto-saved on call disconnect.'
                  }
               });
               session.sessionState.marketing.leadSaved = true;
               console.log('[AUTO-SAVE] Successfully saved lead to DB');
             } catch(e) { console.error('[DB] Auto-save failed:', e); }
          }
          await persistTranscript(session);
          sessions.delete(localStreamSid);
        }
      }
    });
}

const start = async () => {
  try {
    const port = Number(process.env.VOICE_PORT) || 3004;
    await server.listen({ port, host: '0.0.0.0' });
    logger.info(`FIORA Voice Agent running on port ${port}`);

    if (!server.server) {
      throw new Error('[BOOT] FATAL: app.server is null — cannot attach WebSocket server');
    }
    
    const wss = new WebSocketServer({ noServer: true });

    server.server.on('upgrade', (request: IncomingMessage, socket, head) => {
      const urlObj = new URL(request.url || '', `http://${request.headers.host}`);
      
      console.log(`[WS] Upgrade URL: ${urlObj.pathname}`);
      if (urlObj.pathname.includes('/media-stream/')) {
        const token = urlObj.pathname.split('/media-stream/')[1];
        console.log(`[WS] Token: ${token}`);
        
        const tenantData = token ? wsTokens.get(token) : undefined;
        const isValid = !!tenantData;
        console.log(`[WS] Token valid: ${isValid}`);
        
        if (!isValid) {
          const reason = !token ? "Missing token in path" : "Token expired or invalid";
          console.error(`[WS] Rejected: ${reason}`);
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        } else {
          // Consume token
          wsTokens.delete(token as string);
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request, tenantData);
        });
      } else {
        console.error(`[WS] Rejected: Unknown path "${urlObj.pathname}"`);
        socket.destroy();
      }
    });

    wss.on('connection', attachWsHandlers);

    wss.on('error', (err) => {
      console.error('[WSS] ❌ WebSocket server error:', err);
    });

    console.log('\n[BOOT] ══════════════════════════════════════');
    console.log('[BOOT] Server running on port 3004');
    console.log('[BOOT] SET THIS IN TWILIO CONSOLE:');
    console.log('[BOOT] Webhook: https://YOUR_NGROK_URL/inbound-call');
    console.log('[BOOT] ══════════════════════════════════════\n');

  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await server.close();
  await redisSub.quit();
  await redisPub.quit();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await server.close();
  await redisSub.quit();
  await redisPub.quit();
  await prisma.$disconnect();
  process.exit(0);
});
