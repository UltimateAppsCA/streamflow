import channelsData from '@/data/channels.json';

export interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  m3u8Url: string;
  epgUrl?: string;
  headers?: Record<string, string>; // Optional headers for playback
}

export interface EPGProgram {
  title: string;
  description: string;
  start: string;
  end: string;
  category?: string;
}

// Clean and validate channel data
const cleanChannels: Channel[] = channelsData.channels.map((ch: any) => ({
  id: String(ch.id || '').trim() || `channel_${Math.random().toString(36).substr(2, 9)}`,
  name: String(ch.name || 'Unknown').trim(),
  logo: String(ch.logo || '').trim(),
  group: String(ch.group || 'Uncategorized').trim(),
  m3u8Url: String(ch.m3u8Url || '').trim(),
  epgUrl: String(ch.epgUrl || '').trim(),
  // Add referer header for Pluto TV and similar services
  headers: ch.m3u8Url?.includes('pluto.tv') ? {
    'Referer': 'https://pluto.tv/',
    'Origin': 'https://pluto.tv'
  } : undefined
}));

export function getChannels(): Channel[] {
  return cleanChannels;
}

export function getChannelById(id: string): Channel | undefined {
  const cleanId = id.trim();
  return cleanChannels.find((c: Channel) => c.id === cleanId);
}

// Group channels by category
export function getGroupedChannels(): Record<string, Channel[]> {
  const groups: Record<string, Channel[]> = {};
  
  cleanChannels.forEach(channel => {
    const group = channel.group || 'Uncategorized';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(channel);
  });
  
  return groups;
}

// Client-side fetch using query parameter
export async function fetchEPG(channelId: string): Promise<EPGProgram[]> {
  // EPG disabled - return empty array immediately
  return [];
}