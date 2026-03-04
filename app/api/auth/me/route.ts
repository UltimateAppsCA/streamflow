// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';


export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // FRESH DATABASE QUERY - ensures accurate subscribed status
    const sql = neon(process.env.DATABASE_URL!);
    const users = await sql`
      SELECT id, email, subscribed 
      FROM users 
      WHERE id = ${payload.userId}
      LIMIT 1
    `;
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = users[0];
    
    // Debug log (remove in production)
    console.log('Auth check:', {
      userId: user.id,
      email: user.email,
      subscribed: user.subscribed,
      type: typeof user.subscribed
    });
    
    return NextResponse.json({ 
      user: {
        userId: user.id,
        email: user.email,
        subscribed: user.subscribed === null ? false : user.subscribed
      } 
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}