import { financeAgent } from './agent';

export function routeToFinanceAgent(intent: string): boolean {
  const financeKeywords = [
    'invoice', 'invoices', 'bill', 'billing', 
    'payment', 'payments', 'reminder', 'reminders', 
    'collection', 'collections', 'late', 'overdue',
    'summary', 'cashflow', 'revenue', 'expense', 'expenses'
  ];

  const lowerIntent = intent.toLowerCase();
  for (const keyword of financeKeywords) {
    if (lowerIntent.includes(keyword)) {
      return true;
    }
  }

  return false;
}

export { financeAgent };
