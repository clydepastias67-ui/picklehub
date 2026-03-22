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

    const encoded = Buffer.from(secretKey).toString('base64');

    const response = await fetch('https://api.paymongo.com/v1/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encoded}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amount * 100), // convert to centavos
            description,
            currency: 'PHP',
            remarks: `${type}:${referenceId}`, // used in webhook to identify record
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayMongo error:', data);
      return NextResponse.json({ error: data.errors?.[0]?.detail || 'Payment link creation failed' }, { status: 400 });
    }

    return NextResponse.json({
      checkoutUrl: data.data.attributes.checkout_url,
      linkId: data.data.id,
      referenceNumber: data.data.attributes.reference_number,
    });

  } catch (err) {
    console.error('Payment route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}