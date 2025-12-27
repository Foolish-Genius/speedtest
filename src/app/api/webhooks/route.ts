import { NextRequest, NextResponse } from 'next/server';

// In-memory store for webhooks (in production, use a database)
const webhooks: Map<string, {
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
}> = new Map();

// Generate a simple ID
function generateId(): string {
  return 'wh_' + Math.random().toString(36).substring(2, 15);
}

// Generate a webhook secret
function generateSecret(): string {
  return 'whsec_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// GET: List all webhooks
export async function GET() {
  const webhookList = Array.from(webhooks.entries()).map(([id, webhook]) => ({
    id,
    url: webhook.url,
    events: webhook.events,
    active: webhook.active,
    createdAt: webhook.createdAt,
    // Don't expose the secret in list
  }));
  
  return NextResponse.json({
    success: true,
    data: webhookList
  });
}

// POST: Create a new webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, events } = body;
    
    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'URL is required'
      }, { status: 400 });
    }
    
    try {
      new URL(url);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid URL format'
      }, { status: 400 });
    }
    
    // Validate events
    const validEvents = ['test.started', 'test.completed', 'test.failed'];
    const requestedEvents = events || ['test.completed'];
    
    for (const event of requestedEvents) {
      if (!validEvents.includes(event)) {
        return NextResponse.json({
          success: false,
          error: `Invalid event: ${event}. Valid events: ${validEvents.join(', ')}`
        }, { status: 400 });
      }
    }
    
    const id = generateId();
    const secret = generateSecret();
    
    webhooks.set(id, {
      url,
      events: requestedEvents,
      secret,
      active: true,
      createdAt: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      data: {
        id,
        url,
        events: requestedEvents,
        secret, // Only returned on creation
        active: true,
        createdAt: new Date().toISOString()
      },
      message: 'Webhook created successfully. Save your secret - it will not be shown again.'
    }, { status: 201 });
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Invalid request body'
    }, { status: 400 });
  }
}

// DELETE: Remove a webhook
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({
      success: false,
      error: 'Webhook ID is required'
    }, { status: 400 });
  }
  
  if (!webhooks.has(id)) {
    return NextResponse.json({
      success: false,
      error: 'Webhook not found'
    }, { status: 404 });
  }
  
  webhooks.delete(id);
  
  return NextResponse.json({
    success: true,
    message: 'Webhook deleted successfully'
  });
}

// PATCH: Update a webhook
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, url, events, active } = body;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Webhook ID is required'
      }, { status: 400 });
    }
    
    const webhook = webhooks.get(id);
    if (!webhook) {
      return NextResponse.json({
        success: false,
        error: 'Webhook not found'
      }, { status: 404 });
    }
    
    // Update fields
    if (url !== undefined) {
      try {
        new URL(url);
        webhook.url = url;
      } catch {
        return NextResponse.json({
          success: false,
          error: 'Invalid URL format'
        }, { status: 400 });
      }
    }
    
    if (events !== undefined) {
      const validEvents = ['test.started', 'test.completed', 'test.failed'];
      for (const event of events) {
        if (!validEvents.includes(event)) {
          return NextResponse.json({
            success: false,
            error: `Invalid event: ${event}`
          }, { status: 400 });
        }
      }
      webhook.events = events;
    }
    
    if (active !== undefined) {
      webhook.active = Boolean(active);
    }
    
    webhooks.set(id, webhook);
    
    return NextResponse.json({
      success: true,
      data: {
        id,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        createdAt: webhook.createdAt
      }
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Invalid request body'
    }, { status: 400 });
  }
}
