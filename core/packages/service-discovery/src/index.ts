export interface ServiceEndpoint {
  api: string;
  ws?: string;
}

export const SERVICES: Record<string, ServiceEndpoint> = {
  voice: {
    api: process.env.NEXT_PUBLIC_VOICE_API_URL || 'http://localhost:3004',
    ws: process.env.NEXT_PUBLIC_VOICE_WS_URL || 'ws://localhost:3004',
  },
  finance: {
    api: process.env.NEXT_PUBLIC_FINANCE_API_URL || 'http://localhost:3010',
  },
  marketing: {
    api: process.env.NEXT_PUBLIC_MARKETING_API_URL || 'http://localhost:3015',
  },
  sales: {
    api: process.env.NEXT_PUBLIC_SALES_API_URL || 'http://localhost:3020',
  },
  support: {
    api: process.env.NEXT_PUBLIC_SUPPORT_API_URL || 'http://localhost:3025',
  },
  core: {
    api: process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:3001',
    ws: process.env.NEXT_PUBLIC_CORE_WS_URL || 'ws://localhost:3001',
  }
};

export function getServiceUrl(serviceId: string): string {
  return SERVICES[serviceId]?.api || '';
}

export function getServiceWsUrl(serviceId: string): string | undefined {
  return SERVICES[serviceId]?.ws;
}
