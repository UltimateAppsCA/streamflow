import { NextResponse } from 'next/server';
import { getChannels, fetchEPG } from '@/lib/channels';


export async function GET() {
  const channels = getChannels();
  return NextResponse.json({ channels });
}

export async function POST(request: Request) {
  const { channelId } = await request.json();
  const epg = await fetchEPG(channelId);
  return NextResponse.json({ epg });
}