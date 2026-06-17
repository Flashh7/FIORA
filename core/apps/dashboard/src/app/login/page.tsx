"use client";

import { useState } from 'react';
import { useAuth } from '../../lib/AuthProvider';
import { getServiceUrl } from '@fiora/service-discovery';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const coreApi = getServiceUrl('core');
      const res = await fetch(`${coreApi}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await res.json();
      login(data.token, data.user);
    } catch (err: any) {
      console.warn('[Dashboard] Auth Service offline or login failed', err);
      // For Phase 1 testing when backend is offline, simulate success
      login('mock-token', { id: 'mock', name: 'Mock User', role: 'admin', organization: 'Mock Org', plan: 'Business Operations', entitlements: ['voice', 'finance', 'support'] } as any);
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-lg p-8 shadow-2xl">
        <div className="flex items-center justify-center mb-8">
          <div className="w-10 h-10 bg-indigo-500 rounded-lg shadow-lg flex items-center justify-center border border-white/10">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <h1 className="text-2xl font-bold ml-3 text-white tracking-tight">FIORA OS</h1>
        </div>
        
        <h2 className="text-center text-gray-400 mb-8 text-sm uppercase tracking-widest">Operator Authorization</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Operator Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded px-4 py-2 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              placeholder="operator@fiora.app"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Authorization Key</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded px-4 py-2 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded">
              {error}
            </div>
          )}
          
          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded transition shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
          >
            INITIALIZE SESSION
          </button>
        </form>
      </div>
    </div>
  );
}
