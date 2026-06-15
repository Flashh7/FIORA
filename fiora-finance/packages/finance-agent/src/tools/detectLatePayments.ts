import { z } from 'zod';
import { FioraTool } from '../types';
import { sheetsClient } from '../sheets';

const detectLatePaymentsSchema = z.object({});

export const detectLatePaymentsTool: FioraTool<z.infer<typeof detectLatePaymentsSchema>> = {
  name: 'detectLatePayments',
  description: 'Scans the accounting database and returns a list of customers with overdue invoices or payment delays.',
  inputSchema: detectLatePaymentsSchema,
  timeoutMs: 3000,
  async execute(input) {
    console.log(`[FINANCE TOOL: detectLatePayments] Fetching data from Google Sheets...`);
    const ledger = await sheetsClient.getLedger();

    const lateRows = ledger.filter(r => 
      r.type.toLowerCase() === 'revenue' && 
      (r.status.toLowerCase() === 'late' || r.status.toLowerCase() === 'overdue')
    );

    if (lateRows.length === 0) {
      return `No late payments detected in the ledger.`;
    }

    const lateDetails = lateRows.map(r => `${r.customer || 'Unknown Client'} (₹${r.amount})`).join(', ');
    return `Late payments detected: ${lateDetails}.`;
  }
};
