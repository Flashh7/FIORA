import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');

    let whereClause = {};
    if (filter === 'marketing') {
      whereClause = { source: 'Marketing Outbound' };
    } else if (filter === 'sales') {
      whereClause = { status: 'INTERESTED' };
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      take: 100
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error('Failed to fetch leads:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
