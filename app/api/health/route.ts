import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Simple health check endpoint
    return NextResponse.json({ 
      status: 'healthy', 
      timestamp: Date.now(),
      uptime: process.uptime()
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      timestamp: Date.now(),
      error: 'Health check failed'
    }, { status: 500 });
  }
}