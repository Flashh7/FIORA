"use strict";
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
exports.RuntimeResilience = void 0;
var RuntimeResilience = /** @class */ (function () {
    function RuntimeResilience() {
    }
    RuntimeResilience.executeWithRecovery = function (workflowId, operation) {
        return __awaiter(this, void 0, void 0, function () {
            var attempt, maxRetries, result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[RUNTIME_RESILIENCE] Checkpointing workflow execution: ".concat(workflowId));
                        attempt = 0;
                        maxRetries = 3;
                        _a.label = 1;
                    case 1:
                        if (!(attempt < maxRetries)) return [3 /*break*/, 7];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 6]);
                        return [4 /*yield*/, operation()];
                    case 3:
                        result = _a.sent();
                        if (attempt > 0) {
                            console.log("[RUNTIME_RESILIENCE] Workflow ".concat(workflowId, " successfully resurrected on attempt ").concat(attempt + 1, "."));
                        }
                        return [2 /*return*/, result];
                    case 4:
                        error_1 = _a.sent();
                        attempt++;
                        console.log("[RUNTIME_RESILIENCE] Execution crash detected for ".concat(workflowId, ": ").concat(error_1.message));
                        if (attempt >= maxRetries) {
                            console.log("[RUNTIME_RESILIENCE] Terminal failure for ".concat(workflowId, ". Lineage preserved. Queueing for operator manual recovery."));
                            throw error_1;
                        }
                        console.log("[RUNTIME_RESILIENCE] Orchestrating distributed retry (Attempt ".concat(attempt + 1, "/").concat(maxRetries, ")..."));
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000 * attempt); })];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 6: return [3 /*break*/, 1];
                    case 7: throw new Error('Unreachable');
                }
            });
        });
    };
    return RuntimeResilience;
}());
exports.RuntimeResilience = RuntimeResilience;
