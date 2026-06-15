export interface User {
  id: string;
  name: string;
  organization: string;
  plan: string;
  entitlements: string[];
}

export function hasEntitlement(user: User | null, requiredEntitlement: string): boolean {
  if (!user) return false;
  return user.entitlements.includes(requiredEntitlement);
}

export function getUnlockedAgents(user: User | null, allAgents: Record<string, any>): any[] {
  if (!user) return [];
  return Object.values(allAgents).filter(agent => 
    user.entitlements.includes(agent.requiredEntitlement)
  );
}

export function getLockedAgents(user: User | null, allAgents: Record<string, any>): any[] {
  if (!user) return Object.values(allAgents);
  return Object.values(allAgents).filter(agent => 
    !user.entitlements.includes(agent.requiredEntitlement)
  );
}

// In Phase 1, we provide a mocked auth user session
export const MOCK_USER: User = {
  id: 'user_001',
  name: 'Tanay Vashist',
  organization: 'Ramdas Restaurant',
  plan: 'Business Operations',
  entitlements: ['voice', 'finance', 'support']
};
