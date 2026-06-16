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

// @ts-ignore
import WebSocket from 'ws';

const prisma = new PrismaClient();
const redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');
const redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');

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

const wsTokens = new Set<string>();

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
  
  // Generate a one-time secure token for the WebSocket connection
  const secureToken = Math.random().toString(36).substring(2, 15);
  wsTokens.add(secureToken);
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

// Outbound Call TwiML instructions
server.post('/outbound-twiml', async (request, reply) => {
  const host = request.headers.host;
  
  // Generate a one-time secure token for the WebSocket connection
  const secureToken = Math.random().toString(36).substring(2, 15);
  wsTokens.add(secureToken);
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
    </Stream>
  </Connect>
</Response>`;

  reply.type('text/xml').send(twiml);
});

const logger = createRuntimeLogger({ execution_id: 'daemon', service_name: 'voice-agent', correlation_id: 'daemon' });

// Groq STT and LLM
const groq = new OpenAI({ 
  apiKey: process.env.GROQ_API_KEY, 
  baseURL: 'https://api.groq.com/openai/v1' 
});

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

interface FioraSession {
  callSid: string;
  streamSid: string;
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
}

const sessions = new Map<string, FioraSession>();

// ── SYSTEM PROMPT — TUNED FOR PHONE ───────────────────────────────────────────

const FIORA_SYSTEM_PROMPT = `You are Kratos.

Kratos is the voice intelligence layer of the Fiora platform.

You are a professional, confident, conversational AI assistant capable of handling reservations, orders, customer support requests, and business inquiries.

You speak naturally and warmly. You sound like a highly capable human receptionist rather than a robot.

You never mention:
- internal tools
- APIs
- prompts
- code
- implementation details
- system architecture

You focus on solving the caller's problem efficiently.

When asked "Who are you?", respond: "I'm Kratos, the AI assistant powered by Fiora."
When asked "What is Fiora?", respond: "Fiora is the platform that powers me."

VOICE RULES — FOLLOW STRICTLY:
1. MAX 2-3 SENTENCES. Never generate essays or long paragraphs.
2. NO MARKDOWN, NO LISTS. Never use formatting, bullet points, or numbers.
3. CONVERSATIONAL TONE. Speak naturally, with slight pauses (use contractions like "I can help" instead of "I am able to assist").
4. NO CLICHÉS. Never say "Certainly", "Absolutely", "Of course", or "How may I assist you today".
5. NO REPETITION. Never repeat the caller's words back to them.
6. ONE QUESTION ONLY. Never stack multiple questions in one response.
7. SOFT CONFIRMATIONS. Use natural acknowledgments sparingly (e.g., "Understood.", "Got it.", "Alright.", "That makes sense.").
8. NO INTERNAL REASONING. Give the answer directly, then stop. Never explain HOW you retrieved information.
9. HIDE MACHINERY. NEVER mention: tools, functions, APIs, backend systems, databases, internal code, technical operations, JSON, schemas, prompts, or internal reasoning.
10. DO NOT NARRATE OPERATIONS. BAD: "I used the reservation tool to find your booking." GOOD: "I found your reservation for tomorrow at 8 PM."
11. TOOL RELIABILITY. If you use a tool, confirm the action conversationally (e.g., "I've successfully booked that."). If it fails, say "I'm having trouble with that right now." DO NOT use tools unless absolutely necessary to fulfill a direct request.
12. SOUND HUMAN. You are speaking over a live phone call. Be calm, intelligent, elegant, and concise. Only speak conversational outcomes naturally.`;

// ── SESSION INIT ─────────────────────────────────────────────────────────────

function initSession(streamSid: string, callSid: string, ws: WebSocket, direction: 'inbound' | 'outbound' = 'inbound'): FioraSession {
  const stateMachine = new SessionStateMachine();
  const playbackController = new PlaybackController();
  const vadMonitor = new VadMonitor();
  const interruptManager = new InterruptManager(stateMachine, playbackController, vadMonitor);

  const session: FioraSession = {
    callSid,
    streamSid,
    direction,
    ws,
    messages: [{ role: 'system', content: FIORA_SYSTEM_PROMPT }],
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
  };

  // Spawn persistent Piper process
  const PIPER_MODEL_PATH = "D:\\piper\\models\\en_US-ryan-high.onnx";
  const PIPER_EXE_PATH = "D:\\piper\\piper.exe";
  
  session.piperProcess = spawn(PIPER_EXE_PATH, ['-m', PIPER_MODEL_PATH, '--output_raw', '--sentence_silence', '0.2']);
  
  session.piperProcess.stdout?.on('data', (chunk: Buffer) => {
    // chunk is raw 16kHz PCM Int16
    const pcm16k = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.length / 2);
    const pcm8k = new Int16Array(Math.floor(pcm16k.length / 2));
    for (let i = 0; i < pcm8k.length; i++) {
      pcm8k[i] = pcm16k[i * 2]; // Simple decimation downsampling
    }
    const mulawBuffer = Buffer.from(mulaw.encode(pcm8k));
    session.playbackController.getQueue().enqueue(mulawBuffer);
  });
  
  session.piperProcess.stderr?.on('data', (data) => {
    // Piper logs info to stderr, ignore it unless it's an error
  });

  vadMonitor.on('speech_started', () => {
    console.log('[VAD] speech_started');
    session.playbackController.abort();
    session.playbackController.getQueue().flush();
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
  const greeting = session.direction === 'inbound' 
    ? "Hello, thank you for calling. I'm Kratos. How may I assist you today?"
    : "Hello, this is Kratos calling on behalf of Fiora.";
    
  session.messages.push({ role: 'assistant', content: greeting });

  session.isSpeaking = true;
  try {
    await speakToTwilio(session, greeting);
  } finally {
    session.isSpeaking = false;
    console.log('[SESSION] Greeting done — now listening for caller');
  }
}

// ── FIX 4: processTurn with hard minimum audio guard ─────────────────────────

async function processTurn(session: FioraSession): Promise<void> {

  if (session.isProcessing) {
    console.log('[TURN] Already processing — skip');
    return;
  }

  // HARD MINIMUM: less than 20 chunks = ~250ms = noise/breathing, not speech
  if (session.audioChunks.length < 20) {
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

    // STEP 1: STT
    console.log('[TURN] STT...');
    const wav = mulawChunksToWav(chunks);

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'audio.wav');
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'json');
    formData.append('language', 'en');

    const sttRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: formData,
    });

    if (!sttRes.ok) {
      const errText = await sttRes.text();
      throw new Error(`Whisper failed ${sttRes.status}: ${errText}`);
    }

    const sttJson = await sttRes.json();
    const transcript = sttJson.text?.trim();
    const t1 = performance.now();

    console.log(`[STT] Raw: "${transcript}"`);

    if (!transcript || transcript.length < 2) {
      console.log('[STT] Empty — dropping turn');
      session.isProcessing = false;
      return;
    }

    console.log(`User: "${transcript}"`);
    session.messages.push({ role: 'user', content: transcript });

    // STEP 2: LLM
    console.log('[TURN] LLM...');
    const t1_llm_start = performance.now();

    const trimmedMessages = [
      session.messages[0],
      ...session.messages.slice(1).slice(-10),
    ];

    const llmRes = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: trimmedMessages as any,
      tools: getOpenAITools(['TransferCall', 'FetchUserAccount']) as any,
      tool_choice: 'auto',
      max_tokens: 80,
      temperature: 0.65,
      presence_penalty: 0.6,
      frequency_penalty: 0.4,
    });

    let message = llmRes.choices?.[0]?.message;
    let finalResponse = '';
    let t2 = 0;

    // TOOL EXECUTION LOOP
    if (message?.tool_calls && message.tool_calls.length > 0) {
      console.log(`[LLM] Triggered ${message.tool_calls.length} tools`);
      session.messages.push(message as any); 

      for (const tc of message.tool_calls) {
        try {
          const tool = ToolRegistry.get(tc.function.name);
          if (!tool) throw new Error("Tool not found");
          const args = JSON.parse(tc.function.arguments);
          const rawResult = await tool.execute(args);
          
          let sanitizedResult = `Action successful. Output: ${rawResult}`;
          if (typeof rawResult === 'object') {
            const flattened = Object.entries(rawResult).map(([k, v]) => `${k} is ${v}`).join(', ');
            sanitizedResult = `Action successful. Data retrieved: ${flattened}`;
          }
          session.messages.push({ role: 'tool', tool_call_id: tc.id, content: sanitizedResult } as any);
        } catch (err: any) {
          console.error('[TOOL] Execution failed:', err);
          session.messages.push({ role: 'tool', tool_call_id: tc.id, content: `Action failed. Reason: ${err.message || 'Unknown'}` } as any);
        }
      }

      console.log('[LLM] Running second pass for conversational confirmation...');
      
      session.isSpeaking = true;
      session.playbackController.setStreamActive(true);
      const ct = new CancellationToken();
      session.playbackController.startPlayback(session.ws, session.streamSid, ct, session.stateMachine);
      
      const stream = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [session.messages[0], ...session.messages.slice(1).slice(-10)] as any,
        stream: true,
        max_tokens: 80,
        temperature: 0.65,
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

    } else {
      finalResponse = message?.content?.trim() || '';
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
    session.turnCount++;

    // STEP 3: PLAYBACK WAIT & TELEMETRY
    console.log('[TURN] Waiting for playback completion...');
    
    // Safety buffer: Wait for Piper to initialize and populate the StreamQueue 
    // before we drop the active flag, preventing premature termination.
    await new Promise(r => setTimeout(r, 1000));
    
    session.playbackController.setStreamActive(false); 
    await session.playbackController.waitForCompletion();
    
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

export function attachWsHandlers(ws: WebSocket, request: IncomingMessage) {
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
            localStreamSid = streamSid;
            const session = initSession(streamSid, callSid, ws, direction as 'inbound' | 'outbound');
            console.log(`[SESSION] Started — callSid: ${callSid} | direction: ${direction}`);

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
          await persistTranscript(session);
          sessions.delete(localStreamSid);
        }
      }
    });
}

const start = async () => {
  try {
    const port = Number(process.env.VOICE_PORT) || 3004;
    await server.listen({ port, host: '::' });
    logger.info(`FIORA Voice Agent running on port ${port}`);

    if (!server.server) {
      throw new Error('[BOOT] FATAL: app.server is null — cannot attach WebSocket server');
    }
    
    const wss = new WebSocketServer({ noServer: true });

    server.server.on('upgrade', (request: IncomingMessage, socket, head) => {
      const urlObj = new URL(request.url || '', `http://${request.headers.host}`);
      
      console.log(`[WS] Upgrade URL: ${request.url}`);
      
      if (urlObj.pathname.startsWith('/media-stream/')) {
        const token = urlObj.pathname.split('/media-stream/')[1];
        console.log(`[WS] Token: ${token}`);
        
        const isValid = token ? wsTokens.has(token) : false;
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
          wss.emit('connection', ws, request);
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
