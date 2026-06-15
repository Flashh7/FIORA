import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'fs';

async function test() {
  const tts = new MsEdgeTTS();
  await tts.setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.RAW_8KHZ_8BIT_MONO_MULAW);
  
  const chunks: Buffer[] = [];
  const streamObj = tts.toStream('Hello this is a test') as any;
  const stream = streamObj.audioStream || streamObj;
  
  stream.on('data', (c: Buffer) => chunks.push(c));
  stream.on('end', () => {
    const buf = Buffer.concat(chunks);
    console.log(`Bytes: ${buf.length}`);
    if (buf.length > 0) fs.writeFileSync('test.raw', buf);
  });
  stream.on('error', console.error);
}

test();
