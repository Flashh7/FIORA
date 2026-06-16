import { FioraTool } from './types';
import { createInvoiceTool } from './tools/createInvoice';
import { sendInvoiceTool } from './tools/sendInvoice';
import { sendPaymentReminderTool } from './tools/sendPaymentReminder';
import { generateDailySummaryTool } from './tools/generateDailySummary';
import { detectLatePaymentsTool } from './tools/detectLatePayments';
import { categorizeTransactionTool } from './tools/categorizeTransaction';
import { getRecentPaymentsTool } from './tools/getRecentPayments';
import { getRevenueMetricsTool } from './tools/getRevenueMetrics';
import { FINANCE_AGENT_SYSTEM_PROMPT } from './prompts';

export class FinanceAgent {
  public name = 'finance-agent';
  public description = 'Operational Finance Automation Layer. Handles invoices, payment reminders, collections, and financial summaries.';
  public systemPrompt = FINANCE_AGENT_SYSTEM_PROMPT;

  public getTools(): FioraTool[] {
    return [
      createInvoiceTool,
      sendInvoiceTool,
      sendPaymentReminderTool,
      generateDailySummaryTool,
      detectLatePaymentsTool,
      categorizeTransactionTool,
      getRecentPaymentsTool,
      getRevenueMetricsTool,
    ];
  }
}

export const financeAgent = new FinanceAgent();
