import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, description, referenceId, type } = await req.json();

    if (!amount || !description || !referenceId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    console.log('[payment] key exists:', !!secretKey);
    console.log('[payment] key prefix:', secretKey?.substring(0, 12));
    console.log('[payment] amount:', amount);
    console.log('[payment] app url:', process.env.NEXT_PUBLIC_APP_URL);

    if (!secretKey) {
      return NextResponse.json({ error: 'PayMongo key not configured' }, { status: 500 });
    }

    const encoded = Buffer.from(`${secretKey}:`).toString('base64');

    const response = await fetch('https://api.paymongo.com/v1/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encoded}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amount * 100),
            description,
            currency: 'PHP',
            remarks: `${type}:${referenceId}`,
            redirect: {
              success: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
              failed: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failed`,
            },
          },
        },
      }),
    });

    const data = await response.json();
    console.log('[payment] paymongo response status:', response.status);
    console.log('[payment] paymongo response:', JSON.stringify(data));

    if (!response.ok) {
      console.error('PayMongo error:', data);
      return NextResponse.json(
        { error: data.errors?.[0]?.detail || 'Payment link creation failed' },
        { status: 400 }
      );
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