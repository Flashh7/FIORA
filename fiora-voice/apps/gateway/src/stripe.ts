import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_FILL_ME_IN', {
  apiVersion: '2024-04-10', // updated valid API version
});
const prisma = new PrismaClient();
export const provisioningQueue = new Queue('provision-tenant', { connection: { host: 'localhost', port: 6379 } });

export async function stripeWebhookRoutes(server: FastifyInstance) {
  server.post('/api/webhooks/stripe', { config: { rawBody: true } }, async (request: any, reply: FastifyReply) => {
    const sig = request.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_FILL_ME_IN';

    let event: Stripe.Event;
    try {
      if (!request.rawBody) throw new Error('Missing raw body');
      event = stripe.webhooks.constructEvent(request.rawBody, sig, endpointSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return reply.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 1. Idempotency Lock
    try {
      await prisma.stripeEventLog.create({ data: { event_id: event.id } });
    } catch (e: any) {
      if (e.code === 'P2002') { // Prisma unique constraint violation
        console.log(`[STRIPE] Ignored duplicate event: ${event.id}`);
        return reply.status(200).send({ received: true, status: 'duplicate' });
      }
      throw e;
    }

    // 2. Process Event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const sessionEvent = event.data.object as Stripe.Checkout.Session;
          const session = await stripe.checkout.sessions.retrieve(
            sessionEvent.id,
            { expand: ['line_items.data.price'] }
          );
          
          const priceId = session.line_items?.data[0]?.price?.id;
          if (!priceId) throw new Error('No price ID found in session');

          const STRIPE_PLANS: Record<string, string[]> = {
            [process.env.STRIPE_PRICE_STARTER_MONTHLY!]: ['voice_agent'],
            [process.env.STRIPE_PRICE_GROWTH_MONTHLY!]:  ['voice_agent', 'support_agent'],
            [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY!]: ['voice_agent', 'support_agent', 'finance_agent', 'marketing_agent'],
          };

          const features = STRIPE_PLANS[priceId] ?? [];
          if (features.length === 0) throw new Error(`Unknown price ID: ${priceId}`);

          const customerDetails = session.customer_details;
          const businessName = customerDetails?.name || 'New Business';
          const email = customerDetails?.email || 'unknown@example.com';

          const tenant = await prisma.tenant.create({
            data: {
              name: businessName,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              provisioning_status: 'PENDING'
            }
          });

          for (const feature of features) {
            await prisma.serviceEntitlement.create({
              data: {
                tenant_id: tenant.id,
                feature_key: feature,
                is_enabled: true
              }
            });
          }

          // Enqueue Provisioning to BullMQ
          await provisioningQueue.add('provision-tenant', { tenantId: tenant.id }, {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 }
          });

          console.log(`[EMAIL] Welcome to FIORA, ${businessName}. Login link sent to ${email}.`);
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          await prisma.tenant.updateMany({
            where: { stripe_subscription_id: sub.id },
            data: { account_status: 'SUSPENDED' }
          });
          console.log(`[CHURN] Suspended tenant with subscription ${sub.id}`);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          console.log(`[EMAIL] Warning: Payment failed for customer ${invoice.customer}. Please update billing.`);
          // Stripe dunning logic handles the actual retries; we just warn.
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          if (invoice.billing_reason === 'subscription_cycle') {
            await prisma.tenant.updateMany({
              where: { stripe_subscription_id: invoice.subscription as string, account_status: 'SUSPENDED' },
              data: { account_status: 'ACTIVE' }
            });
            console.log(`[BILLING] Reactivated suspended tenant for subscription ${invoice.subscription}`);
          }
          break;
        }

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      return reply.status(200).send({ received: true });
    } catch (err: any) {
      console.error('[STRIPE WEBHOOK ERROR]', err);
      return reply.status(500).send('Internal Webhook Error');
    }
  });
}
