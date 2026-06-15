import { z } from 'zod';
import { FioraTool } from '../types';
import { sheetsClient } from '../sheets';

const createInvoiceSchema = z.object({
  customerName: z.string().describe('Name of the customer receiving the invoice'),
  amount: z.number().describe('Amount to bill the customer'),
  invoiceNumber: z.string().describe('The invoice identifier (e.g., INV-2026-041)'),
  dueDate: z.string().describe('Due date for the payment (e.g., 2026-06-20)'),
  description: z.string().optional().describe('Description of the services or goods provided'),
});

export const createInvoiceTool: FioraTool<z.infer<typeof createInvoiceSchema>> = {
  name: 'createInvoice',
  description: 'Generates a structured invoice object for a customer.',
  inputSchema: createInvoiceSchema,
  timeoutMs: 2000,
  async execute(input) {
    console.log(`[FINANCE TOOL: createInvoice] Executing with input:`, input);
    
    const row = [
      input.dueDate, // Technically Date created vs Due Date, but placing in Date column
      'Revenue',
      input.description || 'Client Payment',
      input.amount,
      'Pending',
      input.customerName,
      input.invoiceNumber
    ];

    const success = await sheetsClient.appendRow(row);
    
    if (success) {
      return `Successfully generated invoice ${input.invoiceNumber} for ${input.customerName} with an amount of ₹${input.amount} due on ${input.dueDate}.`;
    } else {
      return `Failed to generate invoice. Please check the Google Sheets connection.`;
    }
  }
};
