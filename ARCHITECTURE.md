# FIORA OS Architecture

FIORA is fundamentally structured into **5 Operational Pillars**. This strict physical separation ensures optimal performance and purpose-built environments for each type of AI agent.

## 1. FIORA VOICE AGENT
**Path:** `services/agent-voice`
**Type:** Realtime Telephony Server (WebSockets, Twilio Media Streams)
**Purpose:** Telephony-first runtime for live conversational AI.
**Responsibilities:** 
- Inbound and outbound calling
- Receptionist, Support Triage, Concierge

## 2. FIORA MARKETING AGENT
**Path:** `services/agent-marketing`
**Type:** Asynchronous Worker / Cron Server
**Purpose:** Brand and Growth Engine. (No voice runtime).
**Responsibilities:** 
- Content generation and social posting
- Analytics and optimization
- Lead generation campaigns

## 3. FIORA SALES AGENT
**Path:** `services/agent-sales`
**Type:** Omnichannel Event Server
**Purpose:** Revenue and Pipeline Engine.
**Responsibilities:** 
- Lead qualification and CRM updates
- WhatsApp sales and Appointment booking

## 4. FIORA FINANCE AGENT
**Path:** `services/agent-finance`
**Type:** Internal Operations AI (Cron / Webhook Server)
**Purpose:** Separate operational finance system.
**Responsibilities:** 
- Invoicing and payment reminders
- CFO summaries and Google Sheets ledger tracking
- Collections

## 5. FIORA CUSTOMER SUPPORT AGENT
**Path:** `services/agent-support`
**Type:** Async Helpdesk / Ticketing Server
**Purpose:** Separate support platform.
**Responsibilities:** 
- Zendesk/Email ticket resolution
- WhatsApp asynchronous support
- FAQ handling and human escalation routing

---
*Note: Inter-agent communication occurs via formal API boundaries or message queues, not by co-locating code in a single Node.js runtime process.*
