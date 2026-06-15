import { z } from 'zod';
import { FioraTool } from '../types';
import { sheetsClient } from '../sheets';

const generateDailySummarySchema = z.object({});

export const generateDailySummaryTool: FioraTool<z.infer<typeof generateDailySummarySchema>> = {
  name: 'generateDailySummary',
  description: 'Generates a concise CFO-level executive summary of revenue, pending payments, late invoices, and expenses for the day.',
  inputSchema: generateDailySummarySchema,
  timeoutMs: 2000,
  async execute(input) {
    console.log(`[FINANCE TOOL: generateDailySummary] Fetching data from Google Sheets...`);
    const ledger = await sheetsClient.getLedger();

    if (ledger.length === 0) {
      return `Daily Summary Data: No transactions found in the ledger. Please ensure the Google Sheet is connected and populated.`;
    }

    let revenue = 0;
    let pending = 0;
    let lateInvoices = 0;
    let maxExpense = { category: 'None', amount: 0 };

    for (const row of ledger) {
      if (row.type.toLowerCase() === 'revenue') {
        if (row.status.toLowerCase() === 'paid') revenue += row.amount;
        if (row.status.toLowerCase() === 'pending') pending += row.amount;
        if (row.status.toLowerCase() === 'late' || row.status.toLowerCase() === 'overdue') lateInvoices++;
      } else if (row.type.toLowerCase() === 'expense') {
        if (row.amount > maxExpense.amount) {
          maxExpense = { category: row.category, amount: row.amount };
        }
      }
    }
    
    return `Daily Summary Data: We collected ₹${revenue} in revenue today. We have ₹${pending} in pending payments, and ${lateInvoices} late invoices. Our largest expense was ${maxExpense.category} at ₹${maxExpense.amount}.`;
  }
};
