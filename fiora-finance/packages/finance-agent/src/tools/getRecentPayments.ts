import { z } from 'zod';
import { FioraTool } from '../types';
import { fetchRecentPayments } from '../api';

const getRecentPaymentsSchema = z.object({
  limit: z.number().optional().default(5).describe('Number of recent payments to fetch (default 5)'),
});

export const getRecentPaymentsTool: FioraTool<z.infer<typeof getRecentPaymentsSchema>> = {
  name: 'getRecentPayments',
  description: 'Fetches recent successful payments across Stripe and Razorpay.',
  inputSchema: getRecentPaymentsSchema,
  timeoutMs: 5000,
  async execute({ limit }) {
    const finalPayments = await fetchRecentPayments(limit);

    if (finalPayments.length === 0) {
      return "No recent payments found.";
    }

    let report = `Found ${finalPayments.length} recent payments:\n`;
    finalPayments.forEach(p => {
      report += `- [${p.gateway}] ${p.amount} ${p.currency} (Status: ${p.status}) from ${p.customer}\n`;
    });

    return report;
  }
};
