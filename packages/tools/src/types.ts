import { z } from 'zod';

export interface FioraTool<T = any> {
  name: string;
  description: string;
  inputSchema: z.ZodType<T>;
  timeoutMs: number;
  execute: (input: T) => Promise<string>;
}
