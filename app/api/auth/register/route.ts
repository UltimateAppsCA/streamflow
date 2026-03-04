import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';


export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Create user with subscribed defaulting to false
    const passwordHash = await hashPassword(password);
    const result = await sql`
      INSERT INTO users (email, password_hash, subscribed) 
      VALUES (${email}, ${passwordHash}, false) 
      RETURNING id, email, subscribed
    `;

    const user = result[0];
    const token = generateToken({ 
      userId: user.id, 
      email: user.email,
      subscribed: user.subscribed ?? false
    });

    const response = NextResponse.json({ 
      success: true,
      user: { 
        id: user.id, 
        email: user.email,
        subscribed: user.subscribed ?? false
      }
    });
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}