-- CreateEnum
CREATE TYPE "ExecutionMode" AS ENUM ('SIMULATION', 'STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "OperatorRole" AS ENUM ('ADMIN', 'SUPPORT_OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('RUNNING', 'FAILED', 'COMPLETED', 'ESCALATED', 'RETRYING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('PENDING', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EscalationResolution" AS ENUM ('APPROVE', 'REJECT', 'MODIFY', 'REPLAY');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('META_ADS', 'GOOGLE_ADS', 'HUBSPOT', 'SALESFORCE');

-- CreateEnum
CREATE TYPE "ReliabilitySeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'FATAL');

-- CreateEnum
CREATE TYPE "BackpressurePolicy" AS ENUM ('NORMAL', 'THROTTLE_REPLAYS', 'FREEZE_LOW_PRIORITY_WORKFLOWS', 'ESCALATION_ONLY_MODE', 'REJECT_NONCRITICAL_EXECUTIONS');

-- CreateEnum
CREATE TYPE "RuntimeStabilityState" AS ENUM ('STABLE', 'DEGRADED', 'UNSTABLE', 'RECOVERING', 'SATURATED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "max_daily_budget_cents" INTEGER NOT NULL DEFAULT 100000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "OperatorRole" NOT NULL DEFAULT 'VIEWER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLedger" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "parent_execution_id" TEXT,
    "sequence_number" INTEGER NOT NULL,
    "execution_mode" "ExecutionMode" NOT NULL,
    "event_type" TEXT NOT NULL,
    "source_service" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "emitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "workflow_name" TEXT NOT NULL,
    "mode" "ExecutionMode" NOT NULL,
    "status" "ExecutionStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadLetterQueue" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "failed_service" TEXT NOT NULL,
    "error_reason" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeadLetterQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escalation" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "generation_confidence" DOUBLE PRECISION,
    "format_confidence" DOUBLE PRECISION,
    "policy_confidence" DOUBLE PRECISION,
    "final_confidence" DOUBLE PRECISION NOT NULL,
    "context_snapshot" JSONB NOT NULL,
    "status" "EscalationStatus" NOT NULL DEFAULT 'PENDING',
    "resolution_type" "EscalationResolution",
    "resolved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "Escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthIntegration" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "external_account_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MutationAuditLog" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "mutation_type" TEXT NOT NULL,
    "target_resource_id" TEXT NOT NULL,
    "pre_mutation_state" JSONB,
    "post_mutation_state" JSONB,
    "delta" JSONB,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MutationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriftReport" (
    "id" TEXT NOT NULL,
    "original_execution_id" TEXT NOT NULL,
    "replay_execution_id" TEXT NOT NULL,
    "generation_drift_score" DOUBLE PRECISION NOT NULL,
    "confidence_drift_delta" DOUBLE PRECISION NOT NULL,
    "latency_regression_ms" INTEGER NOT NULL,
    "structural_drift_detected" BOOLEAN NOT NULL,
    "orchestration_path_drift" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriftReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeterminismCertification" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "determinism_certified" BOOLEAN NOT NULL,
    "certification_score" DOUBLE PRECISION NOT NULL,
    "drift_detected" BOOLEAN NOT NULL,
    "certification_failures" TEXT[],
    "severity" "ReliabilitySeverity" NOT NULL DEFAULT 'INFO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeterminismCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrchestrationGraphSnapshot" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrchestrationGraphSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuntimeTelemetry" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "time_window_mins" INTEGER NOT NULL,
    "stability_state" "RuntimeStabilityState" NOT NULL DEFAULT 'STABLE',
    "active_backpressure" "BackpressurePolicy" NOT NULL DEFAULT 'NORMAL',
    "queue_latency_ms" INTEGER NOT NULL,
    "replay_throughput_sec" DOUBLE PRECISION NOT NULL,
    "escalation_count" INTEGER NOT NULL,
    "retry_storm_count" INTEGER NOT NULL,
    "clock_skew_detected" BOOLEAN NOT NULL,

    CONSTRAINT "RuntimeTelemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventOrderingCertification" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "ordering_certified" BOOLEAN NOT NULL,
    "ordering_violation_count" INTEGER NOT NULL DEFAULT 0,
    "sequence_gap_detected" BOOLEAN NOT NULL,
    "event_received_at" TIMESTAMP(3) NOT NULL,
    "event_processed_at" TIMESTAMP(3) NOT NULL,
    "processing_duration_ms" INTEGER NOT NULL,
    "clock_skew_detected" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventOrderingCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryCertification" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "recovery_certified" BOOLEAN NOT NULL,
    "recovery_hash" TEXT NOT NULL,
    "recovery_drift_detected" BOOLEAN NOT NULL,
    "recovery_integrity_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecoveryCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalEntropySnapshot" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replay_debt_score" DOUBLE PRECISION NOT NULL,
    "replay_starvation_risk" TEXT NOT NULL,
    "replay_recovery_eta_mins" INTEGER NOT NULL,
    "replay_backlog_growth_rate" DOUBLE PRECISION NOT NULL,
    "entropy_budget" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "entropy_accumulation_rate" DOUBLE PRECISION NOT NULL,
    "runtime_entropy_score" DOUBLE PRECISION NOT NULL,
    "entropy_recovery_rate" DOUBLE PRECISION NOT NULL,
    "approval_pressure_index" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OperationalEntropySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMLead" (
    "id" TEXT NOT NULL,
    "lead_source" TEXT NOT NULL,
    "company_metadata" JSONB NOT NULL,
    "contact_metadata" JSONB NOT NULL,
    "qualification_score" DOUBLE PRECISION,
    "opportunity_tier" TEXT,
    "trust_state" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "escalation_history" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CRMLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMOpportunity" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "opportunity_state" TEXT NOT NULL,
    "state_history" JSONB NOT NULL,
    "replay_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CRMOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachCampaign" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "campaign_status" TEXT NOT NULL,
    "structured_payload" JSONB NOT NULL,
    "escalation_reason" TEXT,
    "outbound_throttled" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationSession" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT,
    "execution_id" TEXT NOT NULL,
    "channel_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentiment_trajectory" JSONB NOT NULL,
    "escalation_reason" TEXT,
    "trust_state" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "replay_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationTurn" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "raw_content" TEXT NOT NULL,
    "structured_intent" JSONB,
    "sentiment_score" DOUBLE PRECISION NOT NULL,
    "emotional_risk" TEXT NOT NULL,
    "governance_flags" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceSession" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "caller_number" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'INBOUND',
    "transport_protocol" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "barge_in_count" INTEGER NOT NULL DEFAULT 0,
    "operator_takeover" BOOLEAN NOT NULL DEFAULT false,
    "escalation_status" TEXT NOT NULL DEFAULT 'NONE',
    "sentiment_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "end_to_end_latency_ms" INTEGER NOT NULL DEFAULT 0,
    "packet_loss_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallTranscript" (
    "id" TEXT NOT NULL,
    "voice_session_id" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallAction" (
    "id" TEXT NOT NULL,
    "voice_session_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "voice_session_id" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadQualification" (
    "id" TEXT NOT NULL,
    "voice_session_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUALIFIED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceLatencyMetric" (
    "id" TEXT NOT NULL,
    "voice_session_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transcript_delay_ms" INTEGER NOT NULL,
    "tts_generation_delay" INTEGER NOT NULL,
    "orchestration_delay_ms" INTEGER NOT NULL,
    "total_latency_ms" INTEGER NOT NULL,
    "escalation_triggered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VoiceLatencyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalSharedMemory" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "aggregated_context" JSONB NOT NULL,
    "trust_score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "escalation_risk" TEXT NOT NULL DEFAULT 'LOW',
    "last_updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalSharedMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossAgentSignal" (
    "id" TEXT NOT NULL,
    "source_agent" TEXT NOT NULL,
    "target_agent" TEXT NOT NULL,
    "signal_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPROCESSED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "CrossAgentSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicBriefing" (
    "id" TEXT NOT NULL,
    "briefing_type" TEXT NOT NULL,
    "insights" JSONB NOT NULL,
    "anomalies_detected" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategicBriefing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporalTrend" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "trend_metric" TEXT NOT NULL,
    "trajectory_30d" JSONB NOT NULL,
    "forecast_90d" JSONB NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporalTrend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationalLearningPolicy" (
    "id" TEXT NOT NULL,
    "detected_pattern" TEXT NOT NULL,
    "root_cause" TEXT NOT NULL,
    "proposed_override" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_HUMAN_APPROVAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationalLearningPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicForecast" (
    "id" TEXT NOT NULL,
    "prediction" TEXT NOT NULL,
    "confidence_range" TEXT NOT NULL,
    "evidence_sources" JSONB NOT NULL,
    "historical_accuracy_score" DOUBLE PRECISION NOT NULL,
    "uncertainty_level" TEXT NOT NULL,
    "volatility_factors" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategicForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationalDrift" (
    "id" TEXT NOT NULL,
    "drift_signal" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "affected_departments" JSONB NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationalDrift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceFatigue" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "burnout_risk_score" DOUBLE PRECISION NOT NULL,
    "escalation_density" INTEGER NOT NULL,
    "intervention_fatigue" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkforceFatigue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_email_key" ON "Operator"("email");

-- CreateIndex
CREATE INDEX "EventLedger_tenant_id_idx" ON "EventLedger"("tenant_id");

-- CreateIndex
CREATE INDEX "EventLedger_execution_id_idx" ON "EventLedger"("execution_id");

-- CreateIndex
CREATE INDEX "EventLedger_correlation_id_idx" ON "EventLedger"("correlation_id");

-- CreateIndex
CREATE INDEX "EventLedger_event_type_idx" ON "EventLedger"("event_type");

-- CreateIndex
CREATE UNIQUE INDEX "Execution_execution_id_key" ON "Execution"("execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthIntegration_tenant_id_provider_key" ON "OAuthIntegration"("tenant_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "MutationAuditLog_idempotency_key_key" ON "MutationAuditLog"("idempotency_key");

-- CreateIndex
CREATE INDEX "MutationAuditLog_tenant_id_idx" ON "MutationAuditLog"("tenant_id");

-- CreateIndex
CREATE INDEX "MutationAuditLog_execution_id_idx" ON "MutationAuditLog"("execution_id");

-- CreateIndex
CREATE INDEX "DriftReport_original_execution_id_idx" ON "DriftReport"("original_execution_id");

-- CreateIndex
CREATE INDEX "DriftReport_replay_execution_id_idx" ON "DriftReport"("replay_execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "DeterminismCertification_execution_id_key" ON "DeterminismCertification"("execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "OrchestrationGraphSnapshot_execution_id_key" ON "OrchestrationGraphSnapshot"("execution_id");

-- CreateIndex
CREATE INDEX "OrchestrationGraphSnapshot_correlation_id_idx" ON "OrchestrationGraphSnapshot"("correlation_id");

-- CreateIndex
CREATE INDEX "RuntimeTelemetry_timestamp_idx" ON "RuntimeTelemetry"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "EventOrderingCertification_execution_id_key" ON "EventOrderingCertification"("execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryCertification_execution_id_key" ON "RecoveryCertification"("execution_id");

-- CreateIndex
CREATE INDEX "OperationalEntropySnapshot_timestamp_idx" ON "OperationalEntropySnapshot"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "CRMOpportunity_execution_id_key" ON "CRMOpportunity"("execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachCampaign_execution_id_key" ON "OutreachCampaign"("execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationSession_execution_id_key" ON "ConversationSession"("execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceSession_conversation_id_key" ON "VoiceSession"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalSharedMemory_entity_id_key" ON "OperationalSharedMemory"("entity_id");

-- CreateIndex
CREATE INDEX "CrossAgentSignal_target_agent_status_idx" ON "CrossAgentSignal"("target_agent", "status");

-- AddForeignKey
ALTER TABLE "Operator" ADD CONSTRAINT "Operator_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLedger" ADD CONSTRAINT "EventLedger_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "Execution"("execution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthIntegration" ADD CONSTRAINT "OAuthIntegration_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutationAuditLog" ADD CONSTRAINT "MutationAuditLog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMOpportunity" ADD CONSTRAINT "CRMOpportunity_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "CRMLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachCampaign" ADD CONSTRAINT "OutreachCampaign_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "CRMLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationTurn" ADD CONSTRAINT "ConversationTurn_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ConversationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallTranscript" ADD CONSTRAINT "CallTranscript_voice_session_id_fkey" FOREIGN KEY ("voice_session_id") REFERENCES "VoiceSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallAction" ADD CONSTRAINT "CallAction_voice_session_id_fkey" FOREIGN KEY ("voice_session_id") REFERENCES "VoiceSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_voice_session_id_fkey" FOREIGN KEY ("voice_session_id") REFERENCES "VoiceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadQualification" ADD CONSTRAINT "LeadQualification_voice_session_id_fkey" FOREIGN KEY ("voice_session_id") REFERENCES "VoiceSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceLatencyMetric" ADD CONSTRAINT "VoiceLatencyMetric_voice_session_id_fkey" FOREIGN KEY ("voice_session_id") REFERENCES "VoiceSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
