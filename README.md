# FIORA OS

FIORA OS is an advanced AI business automation platform that provides a suite of virtual AI agents to handle marketing, sales, customer support, and business intelligence.

## Architecture

This repository is built using a microservices architecture managed by Turborepo:
- **Dashboard**: Next.js frontend (`core/apps/dashboard`)
- **Gateway**: Fastify event broker and TwiML provider (`fiora-voice/apps/gateway`)
- **Voice Agent**: Fastify WebSockets + Twilio Media Streams (`fiora-voice/services/agent-voice`)
- **Marketing/Outbound**: Express-based outbound dialer (`fiora-voice/services/outbound-engine` & `fiora-marketing/services/agent-marketing`)
- **Finance Agent**: Financial metrics integration (`fiora-finance/services/agent-finance`)

## Prerequisites

- Node.js 20+
- PostgreSQL
- Redis
- Ngrok (for Twilio Webhooks)

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment Variables**
   Copy the example environment file and fill in your API keys (Twilio, Groq, OpenAI, etc.):
   ```bash
   cp .env.example .env
   ```

3. **Initialize Database**
   ```bash
   npx prisma generate --schema=core/packages/database/prisma/schema.prisma
   npx prisma db push --schema=core/packages/database/prisma/schema.prisma
   ```

4. **Start Development Servers**
   ```bash
   npm run dev
   ```
   This command automatically boots up all microservices and the Next.js dashboard concurrently.

## AI Personas

- **Hulk**: Marketing & Outbound Lead Generation
- **Iron Man**: Inbound Sales & Booking
- **Homelander**: Customer Support & Issue Escalation
- **Doctor Strange**: Financial & Business Intelligence

Edit `fiora-voice/services/agent-voice/knowledge.txt` to train the agents on your specific business.
