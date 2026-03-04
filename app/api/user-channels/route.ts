import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { sql } from '@/lib/db';

// GET - Fetch user's saved channels
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
if (!payload) {
  return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
}
    const userId = payload.userId;

    const channels = await sql`
      SELECT id, channel_id, channel_name, channel_logo, channel_group, m3u8_url, created_at
      FROM user_channels 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('Error fetching user channels:', error);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}

// POST - Add a channel to user's list
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
if (!payload) {
  return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
}
    const userId = payload.userId;

    const body = await request.json();
    const { channelId, channelName, channelLogo, channelGroup, m3u8Url } = body;

    if (!channelId || !channelName || !m3u8Url) {
      return NextResponse.json({ error: 'Channel ID, name, and stream URL are required' }, { status: 400 });
    }

    // Check if already exists
    const existing = await sql`
      SELECT id FROM user_channels 
      WHERE user_id = ${userId} AND channel_id = ${channelId}
    `;

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Channel already in your list' }, { status: 409 });
    }

    const result = await sql`
      INSERT INTO user_channels (user_id, channel_id, channel_name, channel_logo, channel_group, m3u8_url)
      VALUES (${userId}, ${channelId}, ${channelName}, ${channelLogo || null}, ${channelGroup || null}, ${m3u8Url})
      RETURNING id, channel_id, channel_name, channel_logo, channel_group, m3u8_url, created_at
    `;

    return NextResponse.json({ channel: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Error adding channel:', error);
    return NextResponse.json({ error: 'Failed to add channel' }, { status: 500 });
  }
}