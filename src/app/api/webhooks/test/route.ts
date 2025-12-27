import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Simulate sending a webhook to test the endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, secret } = body;
    
    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL is required'
      }, { status: 400 });
    }
    
    // Sample payload
    const payload = {
      event: 'test.completed',
      timestamp: new Date().toISOString(),
      data: {
        download: 125.45,
        upload: 45.23,
        ping: 15.67,
        jitter: 2.34,
        grade: 'A',
        server: {
          id: 'auto',
          name: 'Auto (Best)'
        }
      },
      test: true // Indicates this is a test webhook
    };
    
    // Generate signature if secret is provided
    let signature = '';
    if (secret) {
      const payloadString = JSON.stringify(payload);
      signature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');
    }
    
    // Send test webhook
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SpeedLabs-Event': 'test.completed',
          'X-SpeedLabs-Signature': signature ? `sha256=${signature}` : '',
          'X-SpeedLabs-Timestamp': new Date().toISOString(),
          'User-Agent': 'SpeedLabs-Webhook/1.0'
        },
        body: JSON.stringify(payload)
      });
      
      return NextResponse.json({
        success: true,
        data: {
          statusCode: response.status,
          statusText: response.statusText,
          delivered: response.ok,
          payload
        },
        message: response.ok 
          ? 'Test webhook delivered successfully' 
          : `Webhook delivered but received ${response.status} response`
      });
    } catch (fetchError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to deliver webhook',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      }, { status: 502 });
    }
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Invalid request body'
    }, { status: 400 });
  }
}
