import { z } from 'zod';
import { FioraTool } from '../types';

const sendPaymentReminderSchema = z.object({
  invoiceId: z.string().describe('The identifier of the invoice to send a reminder for'),
  customerName: z.string().describe('Name of the customer'),
  urgency: z.enum(['standard', 'overdue', 'due_tomorrow']).describe('The urgency of the reminder'),
});

export const sendPaymentReminderTool: FioraTool<z.infer<typeof sendPaymentReminderSchema>> = {
  name: 'sendPaymentReminder',
  description: 'Triggers a polite, professional payment reminder message.',
  inputSchema: sendPaymentReminderSchema,
  timeoutMs: 1500,
  async execute(input) {
    console.log(`[FINANCE TOOL: sendPaymentReminder] Executing with input:`, input);
    await new Promise(resolve => setTimeout(resolve, 800)); // Mock latency
    
    // Return conversational success
    return `Successfully sent a ${input.urgency} payment reminder for invoice ${input.invoiceId} to ${input.customerName}.`;
  }
};
