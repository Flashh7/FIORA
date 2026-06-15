import { z } from 'zod';

export interface Invoice {
  invoiceId: string;
  customer: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  description?: string;
}

export interface DailySummary {
  revenueToday: number;
  pendingPayments: number;
  lateInvoices: number;
  largestExpense: {
    category: string;
    amount: number;
  };
}

export interface FioraTool<T = any> {
  name: string;
  description: string;
  inputSchema: z.ZodType<T>;
  timeoutMs: number;
  execute: (input: T) => Promise<string>;
}
