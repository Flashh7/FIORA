"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateConversationMemory = updateConversationMemory;
function updateConversationMemory(sessionId, newSentiment) {
    console.log("[CONVERSATION_MEMORY] Updating session ".concat(sessionId, " with sentiment ").concat(newSentiment));
    // Mocking trajectory storage
    var mockTrajectory = [0.8, 0.6, newSentiment];
    var risk = 'LOW';
    if (newSentiment < 0.2)
        risk = 'DISTRESSED';
    else if (newSentiment < 0.5)
        risk = 'HIGH';
    return {
        session_id: sessionId,
        sentiment_trajectory: mockTrajectory,
        current_risk: risk
    };
}
