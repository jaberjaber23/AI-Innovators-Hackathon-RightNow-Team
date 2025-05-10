import { NextResponse } from 'next/server';

// WhatsApp Integration Server URL
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'http://localhost:8002';

export async function GET() {
  try {
    // Get WhatsApp integration status
    const response = await fetch(`${WHATSAPP_API_URL}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to connect to WhatsApp integration server' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error connecting to WhatsApp server:', error);
    return NextResponse.json(
      { error: 'Error connecting to WhatsApp integration server' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, message } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Both "to" and "message" fields are required' },
        { status: 400 }
      );
    }

    // Forward the request to the WhatsApp integration server
    const response = await fetch(`${WHATSAPP_API_URL}/send_message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, message }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to send WhatsApp message' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return NextResponse.json(
      { error: 'Error sending WhatsApp message' },
      { status: 500 }
    );
  }
} 