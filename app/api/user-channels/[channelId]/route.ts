import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { sql } from '@/lib/db';

// DELETE - Remove a channel from user's list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
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
    const { channelId } = await params; // Await the params promise

    const result = await sql`
      DELETE FROM user_channels 
      WHERE user_id = ${userId} AND channel_id = ${channelId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Channel not found in your list' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing channel:', error);
    return NextResponse.json({ error: 'Failed to remove channel' }, { status: 500 });
  }
}