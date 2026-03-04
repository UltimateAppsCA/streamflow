import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { subscriptionID, orderID } = await request.json();
    
    // Verify the subscription with PayPal
    const authResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          'AWQZUxmqvaa7ybmR5pydy9uFGhIhZBfajWwWQgDZWEVAtlldic6VvROiphTZFLlP4JUTIGjepp8hw8R6:EH48FKtfGK8FAb1zRxCqcdtjTlXfrcgPpe6wZcb_lwdNd_NtdDzpohSFyHVp0-20rPjjGRgLhqGLG1Jg'
        ).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });
    
    const authData = await authResponse.json();
    
    // Get subscription details
    const subResponse = await fetch(`https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscriptionID}`, {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const subData = await subResponse.json();
    
    if (subData.status === 'ACTIVE' || subData.status === 'APPROVAL_PENDING') {
      // Update user in your database
      // await db.user.update({ subscribed: true, paypalSubscriptionId: subscriptionID });
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: false, error: 'Subscription not active' });
    
  } catch (error) {
    console.error('Subscription activation error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}