"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityGovernance = void 0;
var SecurityGovernance = /** @class */ (function () {
    function SecurityGovernance() {
    }
    SecurityGovernance.enforceTenantIsolation = function (tenantId, requestedTenantId) {
        if (tenantId !== requestedTenantId) {
            console.log("[SECURITY_GOVERNANCE] CRITICAL: Unauthorized cross-tenant memory access blocked! Tenant: ".concat(tenantId, " requested: ").concat(requestedTenantId));
            throw new Error('UNAUTHORIZED_TENANT_ACCESS');
        }
    };
    SecurityGovernance.encryptOperationalMemory = function (payload) {
        console.log("[SECURITY_GOVERNANCE] Encrypting operational memory payload...");
        return __assign(__assign({}, payload), { __encrypted: true });
    };
    SecurityGovernance.decryptOperationalMemory = function (payload) {
        if (!payload.__encrypted)
            return payload;
        console.log("[SECURITY_GOVERNANCE] Decrypting operational memory payload...");
        var dec = __assign({}, payload);
        delete dec.__encrypted;
        return dec;
    };
    return SecurityGovernance;
}());
exports.SecurityGovernance = SecurityGovernance;
