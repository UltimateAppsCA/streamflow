import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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
    const { channelId, programTitle, startTime, endTime } = await request.json();

    // In a real implementation, you'd trigger a background job here
    // For now, we save the recording request to database
    const result = await sql`
      INSERT INTO recordings 
        (user_id, channel_id, program_title, start_time, end_time, status)
      VALUES 
        (${payload.userId}, ${channelId}, ${programTitle}, ${startTime}, ${endTime}, 'scheduled')
      RETURNING id
    `;
    

    return NextResponse.json({ 
      success: true, 
      recordingId: result[0].id,
      message: 'Recording scheduled' 
    });
  } catch (error) {
    console.error('Recording error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule recording' },
      { status: 500 }
    );
  }
}