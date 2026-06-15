import { z } from 'zod';
import { FioraTool } from '../types';

const categorizeTransactionSchema = z.object({
  description: z.string().describe('The transaction description'),
});

export const categorizeTransactionTool: FioraTool<z.infer<typeof categorizeTransactionSchema>> = {
  name: 'categorizeTransaction',
  description: 'Categorizes an expense transaction. (V2 feature, currently stubbed)',
  inputSchema: categorizeTransactionSchema,
  timeoutMs: 500,
  async execute(input) {
    return `Transaction categorized successfully. (Note: Expense categorization is a V2 feature).`;
  }
};
