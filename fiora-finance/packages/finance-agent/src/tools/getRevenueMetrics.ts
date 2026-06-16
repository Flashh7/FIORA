import { z } from 'zod';
import { FioraTool } from '../types';
import { fetchRevenueMetrics } from '../api';

const getRevenueMetricsSchema = z.object({});

export const getRevenueMetricsTool: FioraTool<z.infer<typeof getRevenueMetricsSchema>> = {
  name: 'getRevenueMetrics',
  description: 'Fetches high-level revenue metrics, current account balances, and estimated MRR across all payment gateways.',
  inputSchema: getRevenueMetricsSchema,
  timeoutMs: 5000,
  async execute() {
    const metrics = await fetchRevenueMetrics();
    let report = "Revenue Metrics & Balances:\n";

    if (metrics.stripe.error) report += `- Stripe: API Error\n`;
    else if (metrics.stripe.mocked) report += `- Stripe (Mocked): Available [${metrics.stripe.available}], Pending [${metrics.stripe.pending}], MRR [12,500.00 USD]\n`;
    else report += `- Stripe: Available [${metrics.stripe.available}], Pending [${metrics.stripe.pending}]\n`;

    if (metrics.razorpay.error) report += `- Razorpay: API Error\n`;
    else if (metrics.razorpay.mocked) report += `- Razorpay (Mocked): Recent Volume [${metrics.razorpay.volume}], MRR [${metrics.razorpay.mrr}]\n`;
    else report += `- Razorpay: Recent Volume [${metrics.razorpay.volume}]\n`;

    return report;
  }
};
