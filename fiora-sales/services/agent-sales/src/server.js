"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesAgent = void 0;
var index_1 = require("../../../packages/crm-intelligence/src/index");
var index_2 = require("../../../packages/outreach-governance/src/index");
var index_3 = require("../../../packages/agent-runtime-core/src/index");
var index_4 = require("../../../packages/shared-memory-bus/src/index");
var SalesAgent = /** @class */ (function (_super) {
    __extends(SalesAgent, _super);
    function SalesAgent() {
        return _super.call(this, 'SALES_AGENT') || this;
    }
    SalesAgent.prototype.execute = function (payload, context) {
        return __awaiter(this, void 0, void 0, function () {
            var leadData, engagementHistory, recentOutboundCount, sharedContext, history, leadState, isHighRisk, governance;
            return __generator(this, function (_a) {
                leadData = payload.leadData, engagementHistory = payload.engagementHistory, recentOutboundCount = payload.recentOutboundCount;
                console.log("\n[".concat(this.agentName, "] Processing outbound opportunity for ").concat(leadData.companyName));
                sharedContext = index_4.SharedMemoryBus.readEntityMemory(leadData.companyName, this.agentName);
                history = index_4.SharedMemoryBus.getTemporalHistory(leadData.companyName);
                console.log("[".concat(this.agentName, "] Temporal historical touchpoints retrieved: ").concat(history.length));
                if ((sharedContext === null || sharedContext === void 0 ? void 0 : sharedContext.signal) === 'BUYING_SIGNAL') {
                    console.log("[".concat(this.agentName, "] High-priority buying signal detected in shared memory. Fast-tracking qualification."));
                }
                // Pipeline pressure scaling
                if (payload.pipeline_pressure > 0.8) {
                    console.log("[".concat(this.agentName, "] Pipeline pressure critical. Modulating outbound frequency constraints."));
                }
                leadState = (0, index_1.qualifyLead)(leadData, engagementHistory);
                console.log("[CRM] Lead qualified at ".concat(leadState.opportunity_tier, " (Score: ").concat(leadState.qualification_score, ")"));
                isHighRisk = leadData.domain.endsWith('.info') || leadData.domain.endsWith('.xyz');
                governance = (0, index_2.evaluateOutboundCampaign)(leadState.trust_state, recentOutboundCount, isHighRisk);
                // 3. Structural Output
                if (!governance.action_permitted) {
                    console.log("[OUTREACH_THROTTLED] Campaign blocked: ".concat(governance.escalation_reason));
                    return [2 /*return*/, this.certifyExecution(payload, {
                            status: 'ESCALATED',
                            resolution_required: 'HUMAN_APPROVAL',
                            payload: { leadState: leadState, governance: governance }
                        }, context)];
                }
                console.log("[OUTREACH_GENERATED] Payload verified and certified for dispatch.");
                // Update Shared Memory with Outreach Data
                index_4.SharedMemoryBus.updateEntityMemory(leadData.companyName, this.agentName, { last_outreach: new Date(), tier: leadState.opportunity_tier });
                return [2 /*return*/, this.certifyExecution(payload, {
                        status: 'COMPLETED',
                        structured_outreach_payload: {
                            subject: "Operational Transformation at ".concat(leadData.companyName),
                            body_points: ['Deterministic governance', 'Replay certification']
                        },
                        lineage: { crm_state: leadState, governance_state: governance }
                    }, context)];
            });
        });
    };
    return SalesAgent;
}(index_3.AgentRuntime));
exports.SalesAgent = SalesAgent;
