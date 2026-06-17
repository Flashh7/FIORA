import Stripe from 'stripe';
import Razorpay from 'razorpay';

export async function fetchRecentPayments(limit: number = 5) {
  let payments: any[] = [];

  // Stripe
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' as any });
      const charges = await stripe.charges.list({ limit: limit || 5 });
      payments.push(...charges.data.map((c: any) => ({
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
      amount: '150.00',
      currency: 'USD',
      status: 'succeeded',
      date: new Date(Date.now() - 3600000).toISOString(),
      customer: 'mock_us@example.com'
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
    stripe: { available: '0.00 USD', pending: '0.00 USD', error: false, mocked: false } as any,
    razorpay: { volume: '0.00 INR', mrr: '0.00 INR', error: false, mocked: false } as any
  };

  // Stripe
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' as any });
      const balance = await stripe.balance.retrieve();
      const availableUSD = balance.available.find(b => b.currency === 'usd')?.amount || 0;
      const pendingUSD = balance.pending.find(b => b.currency === 'usd')?.amount || 0;
      metrics.stripe = {
        available: `$${(availableUSD / 100).toFixed(2)}`,
        pending: `$${(pendingUSD / 100).toFixed(2)}`,
        error: false,
        mocked: false
      };
    } catch (err) {
      metrics.stripe.error = true;
    }
  } else {
    metrics.stripe = {
      available: '$14,250.00',
      pending: '$2,340.50',
      error: false,
      mocked: true
    };
  }

  // Razorpay
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      const rzp = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
      const payments = await rzp.payments.all({ count: 100 });
      const captured = payments.items.filter((p: any) => p.status === 'captured');
      const totalVolume = captured.reduce((sum: number, p: any) => sum + p.amount, 0);
      const netProfit = totalVolume * 0.98; // Assuming standard 2% gateway fee
      
      metrics.razorpay = {
        gross_volume: `${(totalVolume / 100).toFixed(2)} INR`,
        net_profit: `${(netProfit / 100).toFixed(2)} INR`,
        transactions: `${captured.length}`,
        aov: captured.length > 0 ? `${((totalVolume / captured.length) / 100).toFixed(2)} INR` : '0.00 INR',
        error: false,
        mocked: false
      } as any;
    } catch (err) {
      metrics.razorpay.error = true;
    }
  } else {
    metrics.razorpay = {
      gross_volume: '845,000.00 INR',
      net_profit: '828,100.00 INR',
      transactions: '142',
      aov: '5,950.70 INR',
      error: false,
      mocked: true
    } as any;
  }

  return metrics;
}
