import { z } from 'zod';
import { FioraTool } from './types';

const getCustomerInfoSchema = z.object({
  customerName: z.string().describe('The name of the customer to look up'),
});

export const getCustomerInfoTool: FioraTool<z.infer<typeof getCustomerInfoSchema>> = {
  name: 'getCustomerInfo',
  description: 'Looks up a customer in the CRM database to retrieve their account status.',
  inputSchema: getCustomerInfoSchema,
  timeoutMs: 1500,
  async execute(input) {
    console.log(`[TOOL: getCustomerInfo] Executing with input:`, input);
    await new Promise(resolve => setTimeout(resolve, 600));
    return `Customer ${input.customerName} is an Enterprise tier member. Account is currently active in good standing.`;
  }
};

const createLeadSchema = z.object({
  customerName: z.string().describe('The name of the new lead'),
  interestLevel: z.string().describe('The level of interest: low, medium, or high'),
});

export const createLeadTool: FioraTool<z.infer<typeof createLeadSchema>> = {
  name: 'createLead',
  description: 'Creates a new sales lead in the CRM pipeline.',
  inputSchema: createLeadSchema,
  timeoutMs: 1500,
  async execute(input) {
    console.log(`[TOOL: createLead] Executing with input:`, input);
    await new Promise(resolve => setTimeout(resolve, 400));
    return `SUCCESS: Created CRM lead for ${input.customerName} with interest level ${input.interestLevel}.`;
  }
};
