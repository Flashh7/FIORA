export class IngressNormalizer {
  public static normalizePayload(channel: string, rawPayload: any) {
    console.log(`[INGRESS_LAYER] Normalizing incoming ${channel} interaction...`);
    
    let content = '';
    if (channel === 'TWILIO_VOICE') {
      content = rawPayload.transcriptionText || '';
    } else if (channel === 'WHATSAPP') {
      content = rawPayload.Body || '';
    }

    return {
      normalized_content: content,
      channel: channel,
      customer_id: rawPayload.From || 'UNKNOWN_CUSTOMER',
      timestamp: new Date()
    };
  }
}
