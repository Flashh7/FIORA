import { NextResponse } from 'next/server';
import { SharedMemoryBus } from '@fiora/shared-memory-bus';

let mocksInitialized = false;

async function populateRealMemory() {
  try {
    // Attempt to fetch real Stripe data from the Finance Agent
    const [metricsRes, recentRes] = await Promise.all([
      fetch('http://localhost:3010/api/payments/metrics', { cache: 'no-store' }).catch(() => null),
      fetch('http://localhost:3010/api/payments/recent', { cache: 'no-store' }).catch(() => null)
    ]);

    const metrics = metricsRes?.ok ? await metricsRes.json() : null;
    const recent = recentRes?.ok ? await recentRes.json() : null;

    if (metrics || recent) {
      // Seed real data from the Finance Agent's API
      SharedMemoryBus.updateEntityMemory('tenant_1', 'org_stripe_account', 'FINANCE_AGENT', { 
        available_balance: metrics?.stripe?.available || '0.00 USD',
        pending_balance: metrics?.stripe?.pending || '0.00 USD',
        is_mocked: metrics?.stripe?.mocked || false,
        recent_transactions_count: recent ? recent.length : 0,
        latest_transaction: recent && recent[0] ? `${recent[0].amount} ${recent[0].currency}` : 'None',
        sync_timestamp: new Date().toISOString()
      });
      
      if (recent && recent.length > 0) {
        recent.forEach((tx: any) => {
          SharedMemoryBus.updateEntityMemory('tenant_1', `tx_${tx.id}`, 'FINANCE_AGENT', {
            amount: tx.amount,
            currency: tx.currency,
            status: tx.status,
            customer: tx.customer,
            date: tx.date
          });
        });
      }
    }
  } catch (error) {
    console.error("Failed to populate memory with real data", error);
  }
}

function populateMockMemory() {
  if (mocksInitialized) return;

  // Pre-populate some other agent contexts
  SharedMemoryBus.updateEntityMemory('tenant_1', 'user_jdoe_104', 'VOICE_AGENT', { 
    sentiment: 'Frustrated',
    current_intent: 'Billing Dispute',
    verified_identity: true,
    call_duration_seconds: 142
  });

  SharedMemoryBus.updateEntityMemory('tenant_1', 'system_global', 'ORCHESTRATOR', { 
    active_agent_count: 4,
    system_load: 'Normal',
    active_sessions: 12
  });

  mocksInitialized = true;
}

export async function GET() {
  populateMockMemory();
  await populateRealMemory();
  
  const data = SharedMemoryBus.dump();
  
  return NextResponse.json(data);
}
