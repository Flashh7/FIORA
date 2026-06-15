import { z } from 'zod';

// ==========================================
// ENUMS & CONSTANTS
// ==========================================

export const ExecutionStatus = {
  RUNNING: 'RUNNING',
  FAILED: 'FAILED',
  COMPLETED: 'COMPLETED',
  ESCALATED: 'ESCALATED',
  RETRYING: 'RETRYING',
  CANCELLED: 'CANCELLED'
} as const;
export type ExecutionStatus = (typeof ExecutionStatus)[keyof typeof ExecutionStatus];

export const ExecutionMode = {
  SIMULATION: 'SIMULATION',
  STAGING: 'STAGING',
  PRODUCTION: 'PRODUCTION'
} as const;
export type ExecutionMode = (typeof ExecutionMode)[keyof typeof ExecutionMode];

export const EscalationStatus = {
  PENDING: 'PENDING',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED'
} as const;
export type EscalationStatus = (typeof EscalationStatus)[keyof typeof EscalationStatus];

export const ExecutionStatusSchema = z.nativeEnum(ExecutionStatus);
export const ExecutionModeSchema = z.nativeEnum(ExecutionMode);
export const EscalationStatusSchema = z.nativeEnum(EscalationStatus);

// ==========================================
// CORE EXECUTION & EVENT TYPES
// ==========================================

export const EventPayloadSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  event_version: z.string().default('1.0'),
  schema_version: z.string().default('2026-06-12'),
  source_service: z.string(),
  type: z.string(),
  execution_mode: ExecutionModeSchema.default(ExecutionMode.SIMULATION),
  execution_id: z.string().uuid(),
  correlation_id: z.string().uuid(), // Distrubuted trace lineage
  parent_execution_id: z.string().uuid().optional(), // For subflows
  sequence_number: z.number().int().nonnegative().default(0), // Deterministic ordering
  emitted_at: z.string().datetime(),
  data: z.record(z.unknown()),
});
export type EventPayload = z.infer<typeof EventPayloadSchema>;

export const ExecutionStateSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  execution_id: z.string().uuid(),
  correlation_id: z.string().uuid(),
  workflow_name: z.string(),
  mode: ExecutionModeSchema,
  status: ExecutionStatusSchema,
  started_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  retry_count: z.number().int().nonnegative().default(0),
  token_budget: z.number().int().optional(),
  latency_budget_ms: z.number().int().optional(),
  retry_budget: z.number().int().default(3),
  context: z.record(z.unknown()),
});
export type ExecutionState = z.infer<typeof ExecutionStateSchema>;

// ==========================================
// ESCALATION & AUDIT TYPES
// ==========================================

export const EscalationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  execution_id: z.string().uuid(),
  correlation_id: z.string().uuid(),
  agent_name: z.string(),
  reason: z.string(),
  generation_confidence: z.number().min(0).max(1).optional(),
  format_confidence: z.number().min(0).max(1).optional(),
  policy_confidence: z.number().min(0).max(1).optional(),
  final_confidence: z.number().min(0).max(1),
  context_snapshot: z.record(z.unknown()),
  status: EscalationStatusSchema.default(EscalationStatus.PENDING),
  resolution_type: z.enum(['APPROVE', 'REJECT', 'MODIFY', 'REPLAY']).optional(),
  resolved_by: z.string().optional(),
  created_at: z.string().datetime(),
  resolved_at: z.string().datetime().optional(),
});
export type Escalation = z.infer<typeof EscalationSchema>;

export const DriftReportSchema = z.object({
  id: z.string().uuid(),
  original_execution_id: z.string().uuid(),
  replay_execution_id: z.string().uuid(),
  generation_drift_score: z.number(), // 0 = identical, higher = more drift
  confidence_drift_delta: z.number(), // absolute difference
  latency_regression_ms: z.number(),  // positive if slower, negative if faster
  structural_drift_detected: z.boolean(),
  orchestration_path_drift: z.boolean(),
  created_at: z.string().datetime(),
});
export type DriftReport = z.infer<typeof DriftReportSchema>;

export const MarketingResponseSchema = z.object({
  execution_id: z.string().uuid(),
  agent_name: z.literal('marketing-agent'),
  agent_version: z.string().default('1.0'),
  prompt_version: z.string().default('1.0'),
  budget: z.object({
    max_tokens: z.number(),
    max_latency_ms: z.number(),
  }),
  output: z.object({
    headline: z.string(),
    body: z.string(),
    cta: z.string(),
  }),
  generation_confidence: z.number().min(0).max(1),
  format_confidence: z.number().min(0).max(1),
  latency_ms: z.number(),
  tokens_used: z.number(),
  final_confidence: z.number().min(0).max(1),
});
export type MarketingResponse = z.infer<typeof MarketingResponseSchema>;

// Phase 5 Schemas

export const ReliabilitySeveritySchema = z.enum(['INFO', 'WARNING', 'CRITICAL', 'FATAL']);
export type ReliabilitySeverity = z.infer<typeof ReliabilitySeveritySchema>;

export const DeterminismCertificationSchema = z.object({
  execution_id: z.string().uuid(),
  determinism_certified: z.boolean(),
  certification_score: z.number(),
  drift_detected: z.boolean(),
  certification_failures: z.array(z.string()),
  severity: ReliabilitySeveritySchema.default('INFO'),
});
export type DeterminismCertification = z.infer<typeof DeterminismCertificationSchema>;

export const OrchestrationGraphSnapshotSchema = z.object({
  execution_id: z.string().uuid(),
  correlation_id: z.string().uuid(),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    service: z.string(),
    status: z.string(),
  })),
  edges: z.array(z.object({
    source: z.string(),
    target: z.string(),
  })),
});
export type OrchestrationGraphSnapshot = z.infer<typeof OrchestrationGraphSnapshotSchema>;

export const AgentActionSchema = z.object({
  action: z.string(),
  final_confidence: z.number().min(0).max(1),
  payload: z.record(z.unknown()),
  reasoning: z.string().optional(),
});
export type AgentAction = z.infer<typeof AgentActionSchema>;
