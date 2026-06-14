"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngressNormalizer = void 0;
var IngressNormalizer = /** @class */ (function () {
    function IngressNormalizer() {
    }
    IngressNormalizer.normalizePayload = function (channel, rawPayload) {
        console.log("[INGRESS_LAYER] Normalizing incoming ".concat(channel, " interaction..."));
        var content = '';
        if (channel === 'TWILIO_VOICE') {
            content = rawPayload.transcriptionText || '';
        }
        else if (channel === 'WHATSAPP') {
            content = rawPayload.Body || '';
        }
        return {
            normalized_content: content,
            channel: channel,
            customer_id: rawPayload.From || 'UNKNOWN_CUSTOMER',
            timestamp: new Date()
        };
    };
    return IngressNormalizer;
}());
exports.IngressNormalizer = IngressNormalizer;
