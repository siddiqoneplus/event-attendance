import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { participants: true, attendance: true }
        }
      }
    });
    return NextResponse.json({ events });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const user = verifyToken(token!);

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Generate unique Event ID robust to deletions
    const year = new Date().getFullYear();
    const lastEvent = await prisma.event.findFirst({
      where: { eventId: { startsWith: `EVENT-${year}-` } },
      orderBy: { eventId: 'desc' }
    });
    
    let nextNum = 1;
    if (lastEvent && lastEvent.eventId) {
      const parts = lastEvent.eventId.split('-');
      if (parts.length === 3) {
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
    }
    const eventId = `EVENT-${year}-${nextNum.toString().padStart(3, '0')}`;

    const newEvent = await prisma.event.create({
      data: {
        eventId,
        name: data.name,
        description: data.description,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        venue: data.venue,
        status: data.status || 'DRAFT',
        createdBy: user.id,
      }
    });

    return NextResponse.json({ event: newEvent });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
