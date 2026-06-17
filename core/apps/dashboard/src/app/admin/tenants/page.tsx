"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../../../lib/AuthProvider';
import { Shield, Phone, Database, Check, X, Building, Loader2 } from 'lucide-react';
import { getServiceUrl } from '@fiora/service-discovery';

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisionParams, setProvisionParams] = useState<Record<string, {countryCode: string, areaCode: string}>>({});
  const { token } = useAuth();

  const fetchTenants = async () => {
    try {
      const coreApi = getServiceUrl('core') || 'http://localhost:3001';
      const res = await fetch(`${coreApi}/api/admin/tenants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTenants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const toggleEntitlement = async (tenantId: string, featureKey: string, currentValue: boolean) => {
    try {
      // Optimistic UI update
      setTenants(prev => prev.map(t => {
        if (t.id !== tenantId) return t;
        const newEntitlements = [...(t.entitlements || [])];
        const idx = newEntitlements.findIndex((e: any) => e.feature_key === featureKey);
        if (idx >= 0) {
          newEntitlements[idx].is_enabled = !currentValue;
        } else {
          newEntitlements.push({ feature_key: featureKey, is_enabled: !currentValue });
        }
        return { ...t, entitlements: newEntitlements };
      }));
      
      const coreApi = getServiceUrl('core') || 'http://localhost:3001';
      await fetch(`${coreApi}/api/admin/tenants/${tenantId}/entitlements`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ feature_key: featureKey, is_enabled: !currentValue })
      });
    } catch (err) {
      console.error("Failed to update entitlement", err);
      fetchTenants(); // Revert on failure
    }
  };

  const provisionTwilioSubaccount = async (tenantId: string) => {
    try {
      // Optimistic transition
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, provisioning_status: 'PROVISIONING', provisioning_error: null } : t));
      
      const coreApi = getServiceUrl('core') || 'http://localhost:3001';
      const params = provisionParams[tenantId] || { countryCode: 'US', areaCode: '' };
      
      const res = await fetch(`${coreApi}/api/admin/tenants/${tenantId}/provision`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      await fetchTenants();
    } catch (err) {
      console.error(err);
      await fetchTenants();
    }
  };

  const hasFeature = (tenant: any, featureKey: string) => tenant.entitlements?.find((e: any) => e.feature_key === featureKey)?.is_enabled || false;

  if (loading) return <div className="flex items-center justify-center h-64 text-purple-400"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center">
            <Shield className="w-8 h-8 mr-3 text-rose-500" />
            Super-Admin: Service Entitlements
          </h1>
          <p className="text-gray-400 mt-2">Manage feature flags and Twilio phone numbers for all FIORA customers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tenants.map(tenant => (
          <div key={tenant.id} className="bg-[#0a0a0c] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <div className="border-b border-white/5 bg-white/[0.02] p-5 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mr-4">
                  <Building className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{tenant.name}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">Tenant ID: {tenant.id}</p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                {tenant.twilio_subaccount_sid || tenant.provisioning_status === 'ACTIVE' ? (
                  <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 flex items-center">
                    <Phone className="w-4 h-4 text-emerald-400 mr-2" />
                    <span className="text-sm font-mono text-gray-300">
                      {tenant.phone_numbers && tenant.phone_numbers.length > 0 
                        ? tenant.phone_numbers[0].phone_number 
                        : 'No Number'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <input 
                      type="text" 
                      placeholder="US"
                      maxLength={2}
                      className="bg-black/40 border border-white/10 text-white text-sm rounded px-2 py-2 w-16 text-center outline-none focus:border-indigo-500"
                      value={provisionParams[tenant.id]?.countryCode || ''}
                      onChange={(e) => setProvisionParams(p => ({...p, [tenant.id]: {...(p[tenant.id] || {countryCode: 'US', areaCode: ''}), countryCode: e.target.value.toUpperCase()}}))}
                    />
                    <input 
                      type="text" 
                      placeholder="Area (opt)"
                      maxLength={3}
                      className="bg-black/40 border border-white/10 text-white text-sm rounded px-2 py-2 w-24 text-center outline-none focus:border-indigo-500"
                      value={provisionParams[tenant.id]?.areaCode || ''}
                      onChange={(e) => setProvisionParams(p => ({...p, [tenant.id]: {...(p[tenant.id] || {countryCode: 'US', areaCode: ''}), areaCode: e.target.value}}))}
                    />
                    <button 
                      onClick={() => provisionTwilioSubaccount(tenant.id)}
                      disabled={tenant.provisioning_status === 'PROVISIONING'}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border shadow-lg ${
                        tenant.provisioning_status === 'PROVISIONING' 
                        ? 'bg-indigo-600/50 border-indigo-500/30 text-white/50 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500/50'
                      }`}
                    >
                      {tenant.provisioning_status === 'PROVISIONING' ? <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" /> : null}
                      {tenant.provisioning_status === 'PROVISIONING' ? 'Provisioning...' : 'Activate Voice Channel'}
                    </button>
                  </div>
                )}
                {tenant.provisioning_status === 'FAILED' && (
                  <p className="text-rose-400 text-xs font-medium bg-rose-500/10 px-2 py-1 rounded">
                    Error: {tenant.provisioning_error || 'Provisioning failed'}
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <EntitlementCard 
                title="Voice Agent" 
                active={hasFeature(tenant, 'voice_agent')} 
                onToggle={() => toggleEntitlement(tenant.id, 'voice_agent', hasFeature(tenant, 'voice_agent'))} 
              />
              <EntitlementCard 
                title="Finance Agent" 
                active={hasFeature(tenant, 'finance_agent')} 
                onToggle={() => toggleEntitlement(tenant.id, 'finance_agent', hasFeature(tenant, 'finance_agent'))} 
              />
              <EntitlementCard 
                title="Marketing Agent" 
                active={hasFeature(tenant, 'marketing_agent')} 
                onToggle={() => toggleEntitlement(tenant.id, 'marketing_agent', hasFeature(tenant, 'marketing_agent'))} 
              />
              <EntitlementCard 
                title="Support Agent" 
                active={hasFeature(tenant, 'support_agent')} 
                onToggle={() => toggleEntitlement(tenant.id, 'support_agent', hasFeature(tenant, 'support_agent'))} 
              />
            </div>
          </div>
        ))}
        {tenants.length === 0 && (
          <div className="text-center py-12 border border-white/5 rounded-xl bg-black/20">
            <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-gray-400 font-medium">No tenants found in the database.</h3>
          </div>
        )}
      </div>
    </div>
  );
}

function EntitlementCard({ title, active, onToggle }: { title: string, active: boolean, onToggle: () => void }) {
  return (
    <div 
      onClick={onToggle}
      className={`relative overflow-hidden rounded-lg border p-4 cursor-pointer transition-all duration-300 ${
        active 
          ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20' 
          : 'bg-black/40 border-white/5 hover:bg-white/[0.02]'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-200">{title}</span>
        {active ? (
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Check className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500/50">
            <X className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="text-xs font-mono">
        <span className={active ? 'text-emerald-400/80' : 'text-gray-600'}>
          {active ? 'ACCESS_GRANTED' : 'ACCESS_DENIED'}
        </span>
      </div>
      
      {active && (
        <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-500/10 blur-xl rounded-full pointer-events-none"></div>
      )}
    </div>
  );
}
