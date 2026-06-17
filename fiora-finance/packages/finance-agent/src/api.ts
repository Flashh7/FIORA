import Stripe from 'stripe';
import Razorpay from 'razorpay';

export async function fetchRecentPayments(limit: number = 5) {
  let payments: any[] = [];


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
    razorpay: { volume: '0.00 INR', mrr: '0.00 INR', error: false, mocked: false } as any
  };

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
    metrics.razorpay.mocked = true;
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
