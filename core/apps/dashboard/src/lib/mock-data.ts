export const systemMetrics = [
  { label: "Active Workflows", value: "14", status: "stable" },
  { label: "Pending Escalations", value: "3", status: "warning" },
  { label: "Avg Final Confidence", value: "0.91", status: "stable" },
  { label: "Events / min", value: "342", status: "stable" },
  { label: "Simulation Runs", value: "89", status: "info" }
];

export const eventStream = [
  { time: "14:23:01", seq: 4, source: "webhook.stripe", event: "payment.succeeded", conf: null, status: "COMPLETED", budget: "12ms" },
  { time: "14:22:45", seq: 2, source: "marketing-agent (v1.0)", event: "generate.content", conf: { gen: 0.95, fmt: 1.0, pol: 0.90, final: 0.90 }, status: "COMPLETED", budget: "4000tk / 800ms", inspectable: true },
  { time: "14:22:10", seq: 12, source: "marketing-agent (v1.0)", event: "generate.content", conf: { gen: 0.88, fmt: 0.95, pol: 0.60, final: 0.60 }, status: "ESCALATED", budget: "3200tk / 650ms", highlight: true, inspectable: true },
  { time: "14:21:05", seq: 1, source: "gateway.api", event: "user.signup", conf: null, status: "RUNNING", budget: "5ms" },
];

export const driftAlerts = [
  { id: "rep_881", drift: "0.14", latency: "+45ms", structural: false },
  { id: "rep_902", drift: "0.00", latency: "-12ms", structural: false },
  { id: "rep_915", drift: "0.85", latency: "+120ms", structural: true, alert: true },
];

export const trustScores = [
  { agent: 'marketing-agent', score: 0.94, tier: 'TIER_1', risk: 'LOW' },
  { agent: 'orchestrator-gateway', score: 0.98, tier: 'TIER_1', risk: 'LOW' },
  { agent: 'research-agent', score: 0.72, tier: 'TIER_3', risk: 'HIGH' }
];

export const traceEvents = [
  { seq: "10452", status: "ORDERING_CERTIFIED", flow: "Gateway → Orchestrator → Redis_Bus", duration: "12ms", skew: "0ms", isError: false },
  { seq: "10453", status: "ESCALATED", flow: "Redis_Bus → Agent_Marketing → Policy_Gate", duration: "2450ms (QUEUE_DELAY)", skew: "0ms", isError: true },
];

export const crmState = [
  { name: "Acme Corp", status: "VERIFIED", tier: "Tier 1 (0.85)", action: "QUALIFIED", risky: false },
  { name: "SpammyLLC", status: "RISKY", tier: "Tier 3 (0.35)", action: "ESCALATED", risky: true }
];

export const liveInteractions = [
  { id: "SESSION-8842 (TWILIO)", status: "ACTIVE", routing: "SUPPORT_AGENT", sentiment: "0.85", isError: false },
  { id: "SESSION-9915 (CHAT)", status: "ESCALATED", routing: "HUMAN_QUEUE", sentiment: "0.12 (DISTRESSED)", isError: true }
];

export const workforceMatrix = [
  { name: "STRATEGIC_INTELLIGENCE", status: "ANALYZING", color: "indigo" },
  { name: "MARKETING_AGENT", status: "EXECUTING", color: "emerald" },
  { name: "SALES_AGENT", status: "QUALIFYING", color: "cyan" },
  { name: "SUPPORT_AGENT", status: "ESCALATING", color: "amber" }
];
