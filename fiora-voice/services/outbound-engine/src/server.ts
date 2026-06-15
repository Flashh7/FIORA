import express from 'express';
import dotenv from 'dotenv';
import { twilioClient } from './twilio';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3005;

app.get('/call', async (req, res) => {
  const to = req.query.to as string;
  if (!to) {
    return res.status(400).json({ error: 'Missing "to" parameter in query string' });
  }

  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    return res.status(500).json({ error: 'Missing TWILIO_PHONE_NUMBER in environment variables' });
  }

  const gatewayUrl = process.env.GATEWAY_NGROK_URL;
  if (!gatewayUrl) {
    return res.status(500).json({ error: 'Missing GATEWAY_NGROK_URL in environment variables' });
  }

  try {
    const call = await twilioClient.calls.create({
      to,
      from,
      url: `${gatewayUrl}/outbound-twiml`,
    });

    console.log(`[OUTBOUND] Initiated call to ${to}. Call SID: ${call.sid}`);
    return res.json({ success: true, callSid: call.sid, status: call.status });
  } catch (error: any) {
    console.error('[OUTBOUND] Error initiating call:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

app.listen(PORT, () => {
  console.log(`Outbound Engine running on port ${PORT}`);
});
