import { z } from 'zod';
import { FioraTool } from './types';

const inputSchema = z.object({
  time: z.string().describe('The time of the reservation, e.g., "8 PM"'),
  partySize: z.number().describe('The number of people for the reservation'),
  date: z.string().optional().describe('The date of the reservation, e.g., "tomorrow" or "Friday"'),
});

type Input = z.infer<typeof inputSchema>;

export const createReservationTool: FioraTool<Input> = {
  name: 'createReservation',
  description: 'Books a restaurant reservation for a given time, party size, and optional date.',
  inputSchema,
  timeoutMs: 1500,
  async execute(input: Input) {
    console.log(`[TOOL: createReservation] Executing with input:`, input);
    
    // Simulate database network call
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simulate success
    const dateStr = input.date ? ` on ${input.date}` : '';
    return `SUCCESS: Reservation confirmed for a party of ${input.partySize} at ${input.time}${dateStr}.`;
  }
};
