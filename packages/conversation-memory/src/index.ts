export interface ConversationalState {
  session_id: string;
  sentiment_trajectory: number[];
  current_risk: string;
}

export function updateConversationMemory(sessionId: string, newSentiment: number): ConversationalState {
  console.log(`[CONVERSATION_MEMORY] Updating session ${sessionId} with sentiment ${newSentiment}`);

  // Mocking trajectory storage
  const mockTrajectory = [0.8, 0.6, newSentiment];
  
  let risk = 'LOW';
  if (newSentiment < 0.2) risk = 'DISTRESSED';
  else if (newSentiment < 0.5) risk = 'HIGH';

  return {
    session_id: sessionId,
    sentiment_trajectory: mockTrajectory,
    current_risk: risk
  };
}
