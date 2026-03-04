import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';


export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Find user with subscribed status
    const result = await sql`
      SELECT id, email, password_hash, subscribed 
      FROM users 
      WHERE email = ${email}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = result[0];
    const validPassword = await comparePassword(password, user.password_hash);

    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create token with subscribed status from database
    const token = generateToken({
      userId: user.id,
      email: user.email,
      subscribed: user.subscribed || false
    });

    const response = NextResponse.json({
      success: true,
      user: { 
        id: user.id, 
        email: user.email,
        subscribed: user.subscribed || false
      }
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}