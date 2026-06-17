import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import pdfParse from 'pdf-parse';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_key_to_prevent_startup_crash' });

function chunkText(text: string, maxTokens: number = 500): string[] {
  // A rough approximation of token size (4 chars per token)
  const maxChars = maxTokens * 4;
  const chunks: string[] = [];
  let currentChunk = '';
  
  // Split by paragraphs
  const paragraphs = text.split(/\n\s*\n/);
  
  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxChars) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += '\n\n' + para;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

export async function knowledgeRoutes(server: FastifyInstance) {
  server.post('/api/tenant/:id/knowledge/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    // Check tenant existence
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });

    let title = 'Document';
    let textContent = '';
    let sourceUrl: string | null = null;

    if (request.isMultipart()) {
      const data = await request.file();
      if (!data) return reply.status(400).send({ error: 'No file uploaded' });
      
      const buffer = await data.toBuffer();
      const pdfData = await pdfParse(buffer);
      textContent = pdfData.text;
      title = data.filename;
    } else {
      const body = request.body as any;
      if (!body || !body.url) return reply.status(400).send({ error: 'Either a PDF file or a URL must be provided' });
      sourceUrl = body.url;
      
      try {
        const response = await fetch(sourceUrl!);
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Remove script and style tags to clean up the content
        $('script, style, nav, footer, header').remove();
        title = $('title').text() || sourceUrl!;
        textContent = $('body').text().replace(/\s+/g, ' ');
      } catch (e: any) {
        return reply.status(400).send({ error: `Failed to fetch URL: ${e.message}` });
      }
    }

    if (!textContent || textContent.trim().length === 0) {
      return reply.status(400).send({ error: 'No text content could be extracted' });
    }

    const chunks = chunkText(textContent);
    let insertedCount = 0;

    for (const chunk of chunks) {
      if (chunk.length < 10) continue; // Skip extremely tiny chunks

      // Get embedding from OpenAI or mock it if using a placeholder key
      let embedding: number[];
      if (process.env.OPENAI_API_KEY === 'sk_test_FILL_ME_IN') {
        embedding = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
      } else {
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk,
        });
        embedding = embeddingResponse.data[0].embedding;
      }

      const embeddingStr = `[${embedding.join(',')}]`;

      // Since Prisma uses Unsupported("vector(1536)") we must use raw SQL for insertion
      await prisma.$executeRaw`
        INSERT INTO "TenantDocument" (id, tenant_id, title, content, source_url, embedding, created_at)
        VALUES (gen_random_uuid(), ${id}, ${title}, ${chunk}, ${sourceUrl}, ${embeddingStr}::vector, NOW())
      `;
      insertedCount++;
    }

    return reply.status(200).send({ success: true, chunksIngested: insertedCount });
  });
}
