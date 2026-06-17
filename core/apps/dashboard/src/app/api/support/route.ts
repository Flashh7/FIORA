import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const tickets = await prisma.supportTicket.findMany({
      orderBy: { created_at: 'desc' },
      take: 100
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Failed to fetch support tickets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
