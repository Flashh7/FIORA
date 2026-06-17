import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { to } = await req.json();

    if (!to) {
      return NextResponse.json({ error: 'Missing phone number' }, { status: 400 });
    }

    // Call the local outbound-engine microservice
    const response = await fetch(`http://localhost:3005/call?to=${encodeURIComponent(to)}`);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to initiate call' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Outbound API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
