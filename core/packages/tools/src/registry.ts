import { FioraTool } from './types';
import { createReservationTool } from './reservations.tool';
import { checkAvailabilityTool } from './calendar.tool';
import { getCustomerInfoTool, createLeadTool } from './crm.tool';
import { financeAgent } from '@fiora/finance-agent';

const financeTools = financeAgent.getTools();

export const ToolRegistry = new Map<string, FioraTool>([
  [createReservationTool.name, createReservationTool],
  [checkAvailabilityTool.name, checkAvailabilityTool],
  [getCustomerInfoTool.name, getCustomerInfoTool],
  [createLeadTool.name, createLeadTool],
  ...financeTools.map(t => [t.name, t] as [string, FioraTool])
]);

import { zodToJsonSchema } from 'zod-to-json-schema';

export function getOpenAITools(toolNames: string[]) {
  const tools: any[] = [];
  for (const name of toolNames) {
    const t = ToolRegistry.get(name);
    if (t) {
      tools.push({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: zodToJsonSchema(t.inputSchema),
        }
      });
    }
  }
  return tools;
}
