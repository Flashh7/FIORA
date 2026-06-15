import { z } from 'zod';
import { FioraTool } from '../types';

const sendInvoiceSchema = z.object({
  invoiceId: z.string().describe('The identifier of the invoice to send'),
  customerName: z.string().describe('Name of the customer'),
  channel: z.enum(['whatsapp', 'sms', 'email']).describe('The channel to use for sending the invoice'),
});

export const sendInvoiceTool: FioraTool<z.infer<typeof sendInvoiceSchema>> = {
  name: 'sendInvoice',
  description: 'Sends an invoice notification to a customer via WhatsApp, SMS, or Email.',
  inputSchema: sendInvoiceSchema,
  timeoutMs: 2000,
  async execute(input) {
    console.log(`[FINANCE TOOL: sendInvoice] Executing with input:`, input);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delivery latency
    
    // Return conversational success
    return `Successfully sent invoice ${input.invoiceId} to ${input.customerName} via ${input.channel.toUpperCase()}.`;
  }
};
