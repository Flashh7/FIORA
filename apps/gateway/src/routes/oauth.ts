import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createRuntimeLogger } from '@fiora/logger';

const prisma = new PrismaClient();

export default async function oauthRoutes(server: FastifyInstance) {
  const logger = createRuntimeLogger({ execution_id: 'oauth', service_name: 'gateway-oauth', correlation_id: 'system' });

  server.get('/api/integrations/oauth/meta/authorize', async (request, reply) => {
    const { tenant_id } = request.query as any;
    if (!tenant_id) {
      return reply.status(400).send({ error: 'tenant_id is required' });
    }
    
    const clientId = process.env.META_APP_ID;
    const redirectUri = process.env.META_OAUTH_REDIRECT_URI || 'http://localhost:3001/api/integrations/oauth/meta/callback';
    
    if (!clientId) {
      return reply.status(500).send({ error: 'META_APP_ID is not configured in .env' });
    }

    const scope = 'ads_management,ads_read';
    const authUrl = `https://www.facebook.com/v17.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${tenant_id}&scope=${scope}`;
    
    return reply.redirect(authUrl);
  });

  server.get('/api/integrations/oauth/meta/callback', async (request, reply) => {
    const { code, state: tenant_id, error, error_reason } = request.query as any;
    
    if (error) {
      logger.error({ error, error_reason }, 'Meta OAuth denied by user');
      return reply.status(400).send({ error: 'OAuth authorization was denied or failed', details: error_reason });
    }

    if (!code || !tenant_id) {
      return reply.status(400).send({ error: 'Invalid callback parameters' });
    }

    const clientId = process.env.META_APP_ID;
    const clientSecret = process.env.META_APP_SECRET;
    const redirectUri = process.env.META_OAUTH_REDIRECT_URI || 'http://localhost:3001/api/integrations/oauth/meta/callback';

    if (!clientId || !clientSecret) {
      return reply.status(500).send({ error: 'META_APP_ID and META_APP_SECRET are not configured' });
    }

    try {
      // Exchange code for short-lived access token
      const tokenResponse = await fetch(`https://graph.facebook.com/v17.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`);
      const tokenData = await tokenResponse.json() as any;

      if (tokenData.error) {
        logger.error({ error: tokenData.error }, 'Failed to exchange Meta OAuth code');
        return reply.status(400).send({ error: 'Token exchange failed', details: tokenData.error });
      }

      const shortLivedToken = tokenData.access_token;

      // Exchange short-lived token for long-lived token
      const longLivedResponse = await fetch(`https://graph.facebook.com/v17.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`);
      const longLivedData = await longLivedResponse.json() as any;

      if (longLivedData.error) {
        logger.error({ error: longLivedData.error }, 'Failed to get long-lived Meta OAuth token');
        return reply.status(400).send({ error: 'Long-lived token exchange failed', details: longLivedData.error });
      }

      const finalToken = longLivedData.access_token;
      const expiresInSeconds = longLivedData.expires_in;
      const expirationDate = expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : null;

      // Fetch the associated business/ad account ID. For simplicity, we just store the token.
      // A production system would query /me/adaccounts to map the specific external_account_id.

      // Upsert the OAuth integration
      await prisma.oAuthIntegration.upsert({
        where: {
          tenant_id_provider: {
            tenant_id,
            provider: 'META_ADS'
          }
        },
        update: {
          access_token: finalToken,
          token_expires_at: expirationDate,
          status: 'ACTIVE'
        },
        create: {
          tenant_id,
          provider: 'META_ADS',
          access_token: finalToken,
          token_expires_at: expirationDate,
          status: 'ACTIVE'
        }
      });

      return reply.send({ status: 'success', message: 'Meta Ads integration connected securely.' });
    } catch (err) {
      logger.error({ err }, 'Exception during Meta OAuth callback');
      return reply.status(500).send({ error: 'Internal server error during token exchange' });
    }
  });
}
