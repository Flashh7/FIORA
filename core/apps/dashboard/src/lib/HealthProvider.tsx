"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getServiceUrl } from '@fiora/service-discovery';

export type ServiceStatus = 'online' | 'offline' | 'starting';

interface HealthContextType {
  statuses: Record<string, ServiceStatus>;
}

const HealthContext = createContext<HealthContextType>({
  statuses: {}
});

export const useHealth = () => useContext(HealthContext);

const AGENTS_TO_MONITOR = ['voice', 'finance', 'marketing', 'sales', 'support', 'core'];

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>({});

  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      const newStatuses: Record<string, ServiceStatus> = {};
      
      await Promise.all(
        AGENTS_TO_MONITOR.map(async (agentId) => {
          const url = getServiceUrl(agentId);
          if (!url) {
            newStatuses[agentId] = 'offline';
            return;
          }

          try {
            // Wait max 3 seconds for health check
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            // Adjust the endpoint if necessary based on your actual agent health route
            const res = await fetch(`${url}/health`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
              newStatuses[agentId] = 'online';
            } else {
              newStatuses[agentId] = 'offline';
            }
          } catch (e) {
            newStatuses[agentId] = 'offline';
          }
        })
      );

      if (isMounted) {
        setStatuses(newStatuses);
      }
    };

    checkHealth();
    // Poll every 10 seconds
    const interval = setInterval(checkHealth, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <HealthContext.Provider value={{ statuses }}>
      {children}
    </HealthContext.Provider>
  );
}
