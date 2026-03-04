// app/api/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';

const PROXY_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, video/mp2t, video/*, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

// FIX: Hardcode your public URL or detect from headers
// Option 1: Hardcode (most reliable for Render)
const PUBLIC_URL = 'https://streamflow-9r6k.onrender.com';

// Option 2: Use environment variable (set in Render dashboard)
// const PUBLIC_URL = process.env.NEXT_PUBLIC_API_URL || 'https://streamflow-9r6k.onrender.com';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  try {
    const targetUrl = new URL(url);
    
    // Determine service type
    const isPluto = url.includes('pluto.tv');
    const isTubi = url.includes('tubi.video') || url.includes('tubi.io');
    const isSamsung = url.includes('samsung.wurl.tv') || url.includes('samsung');
    const isAmagi = url.includes('amagi.tv');
    const isCBC = url.includes('cbcrclinear') || url.includes('rcavlive');
    const isDazn = url.includes('dazn') || url.includes('rakuten');

    // Build headers
    const headers: Record<string, string> = {
      'User-Agent': PROXY_HEADERS['User-Agent'],
      'Accept': PROXY_HEADERS['Accept'],
      'Accept-Language': PROXY_HEADERS['Accept-Language'],
      'Accept-Encoding': 'identity',
      'Cache-Control': 'no-cache',
    };

    // Service-specific headers
    if (isPluto) {
      headers['Origin'] = 'https://pluto.tv';
      headers['Referer'] = 'https://pluto.tv/';
    } else if (isTubi) {
      headers['Origin'] = 'https://tubitv.com';
      headers['Referer'] = 'https://tubitv.com/';
    } else if (isSamsung) {
      headers['Origin'] = 'https://samsungtvplus.com';
      headers['Referer'] = 'https://samsungtvplus.com/';
    } else if (isDazn) {
      // DAZN/Rakuten specific headers
      headers['Origin'] = 'https://www.dazn.com';
      headers['Referer'] = 'https://www.dazn.com/';
      headers['sec-fetch-dest'] = 'empty';
      headers['sec-fetch-mode'] = 'cors';
      headers['sec-fetch-site'] = 'cross-site';
    } else if (isAmagi) {
      headers['Origin'] = targetUrl.origin;
      headers['Referer'] = targetUrl.origin + '/';
    } else if (isCBC) {
      headers['Origin'] = 'https://www.cbc.ca';
      headers['Referer'] = 'https://www.cbc.ca/player/live/';
    } else {
      headers['Origin'] = targetUrl.origin;
      headers['Referer'] = targetUrl.origin + '/';
    }

    console.log(`Proxying: ${url.substring(0, 80)}...`);
    console.log(`Service: ${isDazn ? 'DAZN' : isAmagi ? 'Amagi' : 'Generic'}`);

    const response = await fetch(url, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error body');
      console.error(`Stream fetch failed: ${response.status} ${response.statusText}`);
      
      // Don't return HTML error pages
      if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
        return NextResponse.json({ 
          error: 'Stream blocked or geo-restricted',
          status: response.status
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        error: 'Stream fetch failed',
        status: response.status,
        details: errorText.substring(0, 200)
      }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    const finalUrl = response.url || url;
    const baseUrl = new URL(finalUrl);

    // Check if response is binary (video segment) vs text (playlist)
    const isTextContent = contentType.includes('mpegurl') || 
                          contentType.includes('m3u8') ||
                          contentType.includes('text') ||
                          (!contentType && url.endsWith('.m3u8'));

    // Handle binary video segments
    if (!isTextContent || contentType.includes('video') || contentType.includes('octet-stream')) {
      const arrayBuffer = await response.arrayBuffer();
      
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': contentType || 'video/MP2T',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Process M3U8 playlist
    let body = await response.text();
    
    // Check for HTML error
    if (body.trim().startsWith('<!DOCTYPE') || body.trim().startsWith('<html')) {
      return NextResponse.json({ 
        error: 'Received HTML instead of stream - geo-blocked or authentication required',
        url: url.substring(0, 100)
      }, { status: 403 });
    }

    // CRITICAL FIX: Replace any localhost:10000 that might be in the playlist
    body = body.replace(/https?:\/\/localhost:10000/g, PUBLIC_URL);

    // FIX: Use PUBLIC_URL instead of request.nextUrl.origin
    const proxyBase = `${PUBLIC_URL}/api/stream?url=`;

    // Process M3U8 with improved URL handling
    const lines = body.split('\n');
    const processedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Pass through comments and empty lines
      if (line.startsWith('#') || line === '') {
        processedLines.push(line);
        continue;
      }
      
      // Handle EXT-X-KEY with URI
      if (line.includes('URI="')) {
        const uriMatch = line.match(/URI="([^"]+)"/);
        if (uriMatch) {
          const originalUri = uriMatch[1];
          let absoluteUri: string;
          
          if (originalUri.startsWith('http')) {
            absoluteUri = originalUri;
          } else if (originalUri.startsWith('//')) {
            absoluteUri = 'https:' + originalUri;
          } else {
            absoluteUri = new URL(originalUri, baseUrl).href;
          }
          
          const proxiedUri = `${proxyBase}${encodeURIComponent(absoluteUri)}`;
          line = line.replace(`URI="${originalUri}"`, `URI="${proxiedUri}"`);
        }
        processedLines.push(line);
        continue;
      }
      
      // Handle media URLs (including beacon redirects)
      if (!line.startsWith('#')) {
        let absoluteUrl: string;
        
        if (line.startsWith('http')) {
          absoluteUrl = line;
        } else if (line.startsWith('//')) {
          absoluteUrl = 'https:' + line;
        } else {
          absoluteUrl = new URL(line, baseUrl).href;
        }
        
        // Proxy all segment URLs
        const proxiedUrl = `${proxyBase}${encodeURIComponent(absoluteUrl)}`;
        processedLines.push(proxiedUrl);
      } else {
        processedLines.push(line);
      }
    }

    const modifiedBody = processedLines.join('\n');

    return new NextResponse(modifiedBody, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    
  } catch (error) {
    console.error('Stream proxy error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json({ 
          error: 'Request timeout',
          details: error.message
        }, { status: 504 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Proxy failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}