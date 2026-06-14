import { z } from 'zod';
import { FioraTool } from './types';

const inputSchema = z.object({
  date: z.string().describe('The date to check availability for, e.g., "tomorrow" or "Friday"'),
});

type Input = z.infer<typeof inputSchema>;

export const checkAvailabilityTool: FioraTool<Input> = {
  name: 'checkAvailability',
  description: 'Checks the calendar for available time slots on a given date.',
  inputSchema,
  timeoutMs: 1500,
  async execute(input: Input) {
    console.log(`[TOOL: checkAvailability] Executing with input:`, input);
    
    // Simulate database network call
    await new Promise(resolve => setTimeout(resolve, 500));

    return `Available slots on ${input.date}: 6:00 PM, 8:00 PM, and 9:30 PM.`;
  }
};
