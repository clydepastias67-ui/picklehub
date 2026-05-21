import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, description, referenceId, type } = await req.json();

    if (!amount || !description || !referenceId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const secretKey = process.env.PAYMONGO_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json({ error: 'PayMongo key not configured' }, { status: 500 });
    }

    const encoded = Buffer.from(`${secretKey}:`).toString('base64');

    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encoded}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            billing: { name: 'Customer' },
            line_items: [
              {
                currency: 'PHP',
                amount: Math.round(amount * 100),
                name: description,
                quantity: 1,
              },
            ],
            payment_method_types: ['card', 'gcash', 'paymaya', 'grab_pay'],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failed`,
            description,
            metadata: { type, referenceId },
            send_email_receipt: false,
            show_description: true,
            show_line_items: true,
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayMongo error:', data);
      return NextResponse.json(
        { error: data.errors?.[0]?.detail || 'Payment session creation failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      checkoutUrl: data.data.attributes.checkout_url,
      sessionId: data.data.id,
    });

  } catch (err) {
    console.error('Payment route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}