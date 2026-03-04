// scripts/create-paypal-plan.ts
// Run with: npx ts-node scripts/create-paypal-plan.ts

async function createProductAndPlan() {
  const CLIENT_ID = 'AR_W5Oa39BcREMZxMke5IuhTQf3H_-20lzCwkDv5lTOWAqveVJFJYldMlAbdN8SO6abgwZZUDjYqwotJ';
  const CLIENT_SECRET = 'EPOv16ArAR929XacH8PwbeP4I0OLza0lE7yLjK3bHj_Qhrm424GT8BPoLbp9MnLllhKRAvLIN8wz-zdZ';
  
  // 1. Get Access Token
  const authRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  
  const { access_token } = await authRes.json();
  console.log('✓ Got access token');
  
  // 2. Create Product
  const productRes = await fetch('https://api-m.sandbox.paypal.com/v1/catalogs/products', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'StreamFlow Premium',
      description: 'Ad-free HD streaming with offline downloads',
      type: 'SERVICE',
      category: 'SOFTWARE',
      image_url: 'https://yourdomain.com/logo.png',
      home_url: 'https://yourdomain.com',
    }),
  });
  
  const product = await productRes.json();
  console.log('✓ Created Product ID:', product.id);
  
  // 3. Create Plan ($2.99/month)
  const planRes = await fetch('https://api-m.sandbox.paypal.com/v1/billing/plans', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `plan-${Date.now()}`,
    },
    body: JSON.stringify({
      product_id: product.id,
      name: 'StreamFlow Monthly',
      description: 'Monthly subscription - $2.99',
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1,
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // 0 = infinite
          pricing_scheme: {
            fixed_price: {
              value: '2.99',
              currency_code: 'USD',
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: 'USD',
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
    }),
  });
  
  const plan = await planRes.json();
  console.log('✓ Created Plan ID:', plan.id);
  console.log('');
  console.log('=== ADD THIS TO YOUR CODE ===');
  console.log(`Plan ID: ${plan.id}`);
}

createProductAndPlan().catch(console.error);