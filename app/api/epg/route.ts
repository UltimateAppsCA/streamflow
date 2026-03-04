import { NextRequest, NextResponse } from 'next/server';
import { getChannelById } from '@/lib/channels';


// Parse EPG date format: 20260228120000 +0000 or 20260228120000
function parseEPGDate(dateStr: string): Date {
  const clean = dateStr.trim().replace(/\s+[+-]\d{4}$/, '');
  const year = parseInt(clean.slice(0, 4));
  const month = parseInt(clean.slice(4, 6)) - 1;
  const day = parseInt(clean.slice(6, 8));
  const hour = parseInt(clean.slice(8, 10));
  const minute = parseInt(clean.slice(10, 12));
  const second = parseInt(clean.slice(12, 14));
  
  return new Date(year, month, day, hour, minute, second);
}

async function getEPGXml(): Promise<string> {
  const response = await fetch('https://iptv-epg.org/files/epg-us.xml', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/xml, text/xml, */*'
    },
    // Cache the fetch during build
    cache: 'force-cache'
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.text();
}

function parseChannelEPG(xmlText: string, channelId: string) {
  const programs: any[] = [];
  
  const searchIds = [
    channelId,
    channelId.replace('.us', ''),
    `US - ${channelId.replace('.us', '')}`,
    `US - ${channelId.replace('.us', '').replace(/([A-Z])/g, ' $1').trim()}`
  ];
  
  for (const searchId of searchIds) {
    const escapedId = searchId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`<programme[^>]*\\schannel=["']${escapedId}["'][^>]*>[\\s\\S]*?<\\/programme>`, 'gi');
    const matches = xmlText.match(regex) || [];
    
    matches.forEach(prog => {
      const startMatch = prog.match(/start=["']([^"']+)["']/);
      const stopMatch = prog.match(/stop=["']([^"']+)["']/);
      const titleMatch = prog.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = prog.match(/<desc[^>]*>([^<]+)<\/desc>/i);
      const categoryMatch = prog.match(/<category[^>]*>([^<]+)<\/category>/i);
      
      if (startMatch && stopMatch && titleMatch) {
        try {
          const startDate = parseEPGDate(startMatch[1]);
          const endDate = parseEPGDate(stopMatch[1]);
          
          // For static export, include all programs (or filter differently)
          // Since this is built at build-time, "now" is build time
          programs.push({
            title: titleMatch[1].trim(),
            description: descMatch?.[1]?.trim() || '',
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            category: categoryMatch?.[1]?.trim()
          });
        } catch (e) {
          console.error('Failed to parse date:', startMatch[1], stopMatch[1]);
        }
      }
    });
    
    if (programs.length > 0) break;
  }
  
  return programs.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

// Static export doesn't support query params in the traditional sense
// This will be built with an empty/default parameter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId')?.trim();
    
    if (!channelId) {
      return NextResponse.json({ error: 'channelId query parameter required' }, { status: 400 });
    }

    const channel = getChannelById(channelId);
    
    if (!channel) {
      return NextResponse.json({ 
        error: 'Channel not found', 
        requestedId: channelId
      }, { status: 404 });
    }

    const xmlText = await getEPGXml();
    const programs = parseChannelEPG(xmlText, channelId);
    
    return NextResponse.json({ programs, channelId });
  } catch (error) {
    console.error('EPG fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch EPG', details: (error as Error).message, programs: [] },
      { status: 500 }
    );
  }
}