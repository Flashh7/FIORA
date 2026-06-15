import Fastify from 'fastify';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { createRuntimeLogger } from '@fiora/logger';
import { mulaw } from 'alawmulaw';
import OpenAI, { toFile } from 'openai';
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { WaveFile } from 'wavefile';
import { AgentRouter } from '@fiora/agents';
import { getOpenAITools, ToolRegistry } from '@fiora/tools';
import { SessionStateMachine, TelemetryLogger, ToolLockManager, VadMonitor, PlaybackController, InterruptManager, CancellationToken } from '@fiora/runtime';

// @ts-ignore
import WebSocket from 'ws';

const prisma = new PrismaClient();
const redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');
const redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');

const server = Fastify({ logger: false });

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

server.post('/inbound-call', async (req, reply) => {
  console.log('\n[WEBHOOK] Twilio called');
  console.log('[WEBHOOK] Content-Type:', req.headers['content-type']);
  console.log('[WEBHOOK] Body:', JSON.stringify(req.body));
  
  const host = req.headers.host;
  const wsUrl = `wss://${host}/media-stream`;
  console.log('[WEBHOOK] WebSocket URL:', wsUrl);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}" />
  </Connect>
</Response>`;

  console.log('[TWIML]', twiml);
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
}

const sessions = new Map<string, FioraSession>();

// ── SYSTEM PROMPT — TUNED FOR PHONE ───────────────────────────────────────────

const FIORA_SYSTEM_PROMPT = `You are FIORA, an elite AI executive assistant speaking over a phone call.

VOICE RULES — FOLLOW STRICTLY:
1. MAX 2-3 SENTENCES. Never generate essays or long paragraphs.
2. NO MARKDOWN, NO LISTS. Never use formatting, bullet points, or numbers.
3. CONVERSATIONAL TONE. Speak naturally, with slight pauses (use commas).
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

function initSession(streamSid: string, callSid: string, ws: WebSocket): FioraSession {
  const stateMachine = new SessionStateMachine();
  const playbackController = new PlaybackController();
  const vadMonitor = new VadMonitor();
  const interruptManager = new InterruptManager(stateMachine, playbackController, vadMonitor);

  const session: FioraSession = {
    callSid,
    streamSid,
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
  };

  vadMonitor.on('speech_started', () => {
    // If not interrupted/speaking, we start buffering immediately in the media handler
    console.log('[VAD] speech_started');
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

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const tempInPath = path.join(os.tmpdir(), `fiora_tts_in_${Date.now()}.txt`);
  const tempOutPath = path.join(os.tmpdir(), `fiora_tts_out_${Date.now()}.wav`);
  
  fs.writeFileSync(tempInPath, text);
  
  try {
    execSync(`"${PIPER_EXE}" -m "${PIPER_MODEL}" --sentence_silence 0.4 -f "${tempOutPath}" < "${tempInPath}"`);
    console.log('[TTS] WAV GENERATED:', tempOutPath);
    
    const size = fs.statSync(tempOutPath).size;
    console.log('[TTS] WAV BYTES:', size);
    
    if (size <= 1000) {
      throw new Error(`TTS failed, WAV size is too small: ${size} bytes`);
    }
    
    const wavBuffer = fs.readFileSync(tempOutPath);
    const outWav = new WaveFile(wavBuffer);
    outWav.toSampleRate(8000);
    outWav.toMuLaw();
    
    const convertedBuffer = Buffer.from(outWav.toBuffer());
    return convertedBuffer.slice(44); // raw mulaw
  } finally {
    try { if (fs.existsSync(tempInPath)) fs.unlinkSync(tempInPath); } catch (e) {}
    try { if (fs.existsSync(tempOutPath)) fs.unlinkSync(tempOutPath); } catch (e) {}
  }
}

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

// ── FIX 1: sendAudioToTwilio returns Promise ──────────────────────────────────

async function sendAudioToTwilio(
  ws: WebSocket,
  streamSid: string,
  mulawBuffer: Buffer
): Promise<void> {
  const CHUNK_SIZE = 160;
  const INTERVAL_MS = 20;
  let offset = 0;

  while (offset < mulawBuffer.length) {
    if (ws.readyState !== WebSocket.OPEN) {
      console.warn('[AUDIO] WebSocket closed mid-playback');
      break;
    }

    const chunk = mulawBuffer.subarray(offset, offset + CHUNK_SIZE);
    offset += CHUNK_SIZE;

    ws.send(JSON.stringify({
      event: 'media',
      streamSid,
      media: { payload: chunk.toString('base64') },
    }));

    // EXACT 20ms pacing per Twilio requirement
    await new Promise(r => setTimeout(r, INTERVAL_MS));
  }

  console.log(`[AUDIO] Playback complete — ${mulawBuffer.length} bytes sent`);
}

// ── FIX 2: speakToTwilio awaits full playback ─────────────────────────────────

async function speakToTwilio(
  ws: WebSocket,
  streamSid: string,
  text: string
): Promise<void> {
  const mulaw = await synthesizeSpeech(text);
  await sendAudioToTwilio(ws, streamSid, mulaw); // NOW AWAITED — isSpeaking stays true the whole time
}

// ── FIX 3: speakFirst with post-speech buffer ─────────────────────────────────

async function speakFirst(session: FioraSession): Promise<void> {
  const greeting = "Hello, this is FIORA. How can I help you today?";
  session.messages.push({ role: 'assistant', content: greeting });

  session.isSpeaking = true;
  try {
    await speakToTwilio(session.ws, session.streamSid, greeting);
    await new Promise(r => setTimeout(r, 500)); // 500ms buffer — lets caller prepare to speak
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

    const runLLM = async () => {
      const trimmedMessages = [
        session.messages[0],
        ...session.messages.slice(1).slice(-10), // Reduced from 20 to 10 for faster context processing
      ];

      const llmRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: trimmedMessages,
          tools: getOpenAITools(Array.from(ToolRegistry.keys())),
          tool_choice: 'auto',
          max_tokens: 80,
          temperature: 0.65,
          presence_penalty: 0.6,
          frequency_penalty: 0.4,
        }),
      });

      if (!llmRes.ok) {
        const errText = await llmRes.text();
        throw new Error(`LLM failed ${llmRes.status}: ${errText}`);
      }

      return await llmRes.json();
    };

    let llmJson = await runLLM();
    let message = llmJson.choices?.[0]?.message;

    // TOOL EXECUTION LOOP
    if (message?.tool_calls?.length > 0) {
      console.log(`[LLM] Triggered ${message.tool_calls.length} tools`);
      session.messages.push(message); // push the assistant tool call

      for (const tc of message.tool_calls) {
        try {
          const tool = ToolRegistry.get(tc.function.name);
          if (!tool) throw new Error("Tool not found");
          const args = JSON.parse(tc.function.arguments);
          const rawResult = await tool.execute(args);
          
          // Sanitize raw JSON payloads into conversational context so the LLM doesn't read JSON out loud
          let sanitizedResult = `Action successful. Output: ${rawResult}`;
          if (typeof rawResult === 'object') {
            const flattened = Object.entries(rawResult).map(([k, v]) => `${k} is ${v}`).join(', ');
            sanitizedResult = `Action successful. Data retrieved: ${flattened}`;
          }
          session.messages.push({ role: 'tool', tool_call_id: tc.id, content: sanitizedResult });
        } catch (err: any) {
          console.error('[TOOL] Execution failed:', err);
          session.messages.push({ role: 'tool', tool_call_id: tc.id, content: `Action failed. Reason: ${err.message || 'Unknown'}` });
        }
      }

      console.log('[LLM] Running second pass for conversational confirmation...');
      llmJson = await runLLM();
      message = llmJson.choices?.[0]?.message;
    }

    const t2 = performance.now();
    const response = message?.content?.trim();

    if (!response) {
      console.log('[LLM] Empty response — dropping');
      session.isProcessing = false;
      return;
    }

    console.log(`FIORA: "${response}"`);
    session.messages.push({ role: 'assistant', content: response });
    session.turnCount++;

    // STEP 3: TTS
    console.log('[TURN] TTS...');
    session.isSpeaking = true;
    await speakToTwilio(session.ws, session.streamSid, response);
    const t3 = performance.now();
    console.log(`\n[LATENCY] STT: ${(t1-t0).toFixed(0)}ms | LLM: ${(t2-t1).toFixed(0)}ms | TTS: ${(t3-t2).toFixed(0)}ms | Total: ${(t3-t0).toFixed(0)}ms\n`);
    
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
            const { streamSid, callSid } = msg.start;
            localStreamSid = streamSid;
            const session = initSession(streamSid, callSid, ws);
            console.log(`[SESSION] Started — callSid: ${callSid}`);

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
      const url = request.url;
      console.log(`\n[UPGRADE] WebSocket upgrade request received`);
      console.log(`[UPGRADE] Path: ${url}`);
      
      if (url === '/media-stream') {
        console.log('[UPGRADE] Path matches /media-stream — accepting handshake');
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        console.warn(`[UPGRADE] Unknown path "${url}" — rejecting`);
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
