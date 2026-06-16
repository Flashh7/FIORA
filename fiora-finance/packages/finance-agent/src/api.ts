import Stripe from 'stripe';
import Razorpay from 'razorpay';

export async function fetchRecentPayments(limit: number = 5) {
  let payments: any[] = [];
  
  // Stripe
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-05-27.dahlia' });
      const charges = await stripe.charges.list({ limit: limit || 5 });
      payments.push(...charges.data.map(c => ({
        gateway: 'Stripe',
        id: c.id,
        amount: (c.amount / 100).toFixed(2),
        currency: c.currency.toUpperCase(),
        status: c.status,
        date: new Date(c.created * 1000).toISOString(),
        customer: c.receipt_email || 'Unknown'
      })));
    } catch (err) {
      console.error('[Stripe] Failed to fetch payments:', err);
    }
  } else {
    payments.push({
      gateway: 'Stripe',
      id: 'mock_ch_1',
      amount: '120.00',
      currency: 'USD',
      status: 'succeeded',
      date: new Date().toISOString(),
      customer: 'mock@example.com'
    });
  }

  // Razorpay
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      const rzp = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
      const rzpPayments = await rzp.payments.all({ count: limit || 5 });
      payments.push(...rzpPayments.items.map((p: any) => ({
        gateway: 'Razorpay',
        id: p.id,
        amount: (p.amount / 100).toFixed(2),
        currency: p.currency,
        status: p.status,
        date: new Date(p.created_at * 1000).toISOString(),
        customer: p.email || 'Unknown'
      })));
    } catch (err) {
      console.error('[Razorpay] Failed to fetch payments:', err);
    }
  } else {
    payments.push({
      gateway: 'Razorpay',
      id: 'mock_pay_1',
      amount: '4500.00',
      currency: 'INR',
      status: 'captured',
      date: new Date(Date.now() - 86400000).toISOString(),
      customer: 'mock_in@example.com'
    });
  }

  payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return payments.slice(0, limit);
}

export async function fetchRevenueMetrics() {
  const metrics = {
    stripe: { available: '0.00 USD', pending: '0.00 USD', error: false, mocked: false },
    razorpay: { volume: '0.00 INR', mrr: '0.00 INR', error: false, mocked: false }
  };

  // Stripe
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-05-27.dahlia' });
      const balance = await stripe.balance.retrieve();
      metrics.stripe.available = balance.available.map(b => `${(b.amount / 100).toFixed(2)} ${b.currency.toUpperCase()}`).join(', ') || '0.00 USD';
      metrics.stripe.pending = balance.pending.map(b => `${(b.amount / 100).toFixed(2)} ${b.currency.toUpperCase()}`).join(', ') || '0.00 USD';
    } catch (err) {
      metrics.stripe.error = true;
    }
  } else {
    metrics.stripe.mocked = true;
    metrics.stripe.available = '15,402.00 USD';
    metrics.stripe.pending = '1,200.00 USD';
  }

  // Razorpay
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      const rzp = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
      const payments = await rzp.payments.all({ count: 100 });
      const totalVolume = payments.items.reduce((sum: number, p: any) => sum + (p.status === 'captured' ? p.amount : 0), 0);
      metrics.razorpay.volume = `${(totalVolume / 100).toFixed(2)} INR`;
    } catch (err) {
      metrics.razorpay.error = true;
    }
  } else {
    metrics.razorpay.mocked = true;
    metrics.razorpay.volume = '845,000.00 INR';
    metrics.razorpay.mrr = '420,000.00 INR';
  }

  return metrics;
}
