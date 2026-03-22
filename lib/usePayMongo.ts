// lib/usePayMongo.ts
// Reusable hook for PayMongo payments across all pages

export type PaymentType = 'booking' | 'food' | 'coaching' | 'tournament' | 'shop';

interface PayMongoOptions {
  amount: number;
  description: string;
  referenceId: string;
  type: PaymentType;
}

interface PayMongoResult {
  checkoutUrl: string;
  linkId: string;
  referenceNumber: string;
}

export async function createPayment(options: PayMongoOptions): Promise<PayMongoResult> {
  const response = await fetch('/api/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Payment creation failed');
  }

  return data;
}

// Redirect user to PayMongo checkout
export async function redirectToPayment(options: PayMongoOptions): Promise<void> {
  const result = await createPayment(options);
  window.location.href = result.checkoutUrl;
}