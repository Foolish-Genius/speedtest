import { NextRequest, NextResponse } from 'next/server';

// Speed test configuration
const CONFIG = {
  downloadTestSize: 1024 * 1024 * 5, // 5MB
  uploadTestSize: 1024 * 1024 * 2, // 2MB
  pingIterations: 10,
};

// Simulate realistic speed measurements
function simulateSpeedTest() {
  // Simulate download speed (10-1000 Mbps range with realistic distribution)
  const downloadBase = 50 + Math.random() * 150;
  const downloadVariation = downloadBase * (0.9 + Math.random() * 0.2);
  
  // Simulate upload speed (usually 10-50% of download)
  const uploadRatio = 0.2 + Math.random() * 0.3;
  const uploadBase = downloadVariation * uploadRatio;
  const uploadVariation = uploadBase * (0.9 + Math.random() * 0.2);
  
  // Simulate ping (5-50ms range)
  const ping = 5 + Math.random() * 45;
  
  // Simulate jitter (0.5-10ms range)
  const jitter = 0.5 + Math.random() * 9.5;
  
  return {
    download: Math.round(downloadVariation * 100) / 100,
    upload: Math.round(uploadVariation * 100) / 100,
    ping: Math.round(ping * 100) / 100,
    jitter: Math.round(jitter * 100) / 100,
    timestamp: new Date().toISOString(),
    server: {
      id: 'auto',
      name: 'Auto (Best)',
      location: 'Nearest Server'
    }
  };
}

// Calculate performance grade
function calculateGrade(download: number, upload: number, ping: number, jitter: number): string {
  let score = 0;
  
  // Download scoring (max 40 points)
  if (download >= 500) score += 40;
  else if (download >= 250) score += 35;
  else if (download >= 100) score += 30;
  else if (download >= 50) score += 25;
  else if (download >= 25) score += 20;
  else if (download >= 10) score += 15;
  else score += 10;
  
  // Upload scoring (max 25 points)
  if (upload >= 100) score += 25;
  else if (upload >= 50) score += 22;
  else if (upload >= 25) score += 18;
  else if (upload >= 10) score += 14;
  else score += 10;
  
  // Ping scoring (max 20 points)
  if (ping <= 10) score += 20;
  else if (ping <= 20) score += 17;
  else if (ping <= 30) score += 14;
  else if (ping <= 50) score += 11;
  else score += 8;
  
  // Jitter scoring (max 15 points)
  if (jitter <= 2) score += 15;
  else if (jitter <= 5) score += 12;
  else if (jitter <= 10) score += 9;
  else score += 6;
  
  // Convert score to grade
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'F';
}

// GET: Run a speed test and return results
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get('format') || 'json';
  const callback = searchParams.get('callback'); // JSONP support
  
  // Simulate test (in a real implementation, this would actually measure)
  const results = simulateSpeedTest();
  const grade = calculateGrade(results.download, results.upload, results.ping, results.jitter);
  
  const response = {
    success: true,
    data: {
      ...results,
      grade,
      units: {
        download: 'Mbps',
        upload: 'Mbps',
        ping: 'ms',
        jitter: 'ms'
      }
    },
    meta: {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      testDuration: '~5 seconds'
    }
  };
  
  // JSONP support
  if (format === 'jsonp' && callback) {
    const jsonpResponse = `${callback}(${JSON.stringify(response)})`;
    return new NextResponse(jsonpResponse, {
      headers: {
        'Content-Type': 'application/javascript',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
  
  return NextResponse.json(response, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// POST: Run a speed test with custom configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, testType } = body;
    
    const results = simulateSpeedTest();
    
    // Override server if specified
    if (serverId && serverId !== 'auto') {
      results.server.id = serverId;
      results.server.name = `Server ${serverId}`;
    }
    
    const grade = calculateGrade(results.download, results.upload, results.ping, results.jitter);
    
    // If testType is 'ping-only', only return ping data
    if (testType === 'ping-only') {
      return NextResponse.json({
        success: true,
        data: {
          ping: results.ping,
          jitter: results.jitter,
          timestamp: results.timestamp,
          server: results.server
        }
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...results,
        grade,
        units: {
          download: 'Mbps',
          upload: 'Mbps',
          ping: 'ms',
          jitter: 'ms'
        }
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Invalid request body'
    }, { 
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

// OPTIONS: CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
