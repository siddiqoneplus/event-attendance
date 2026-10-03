import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: { participants: true, attendance: true }
        }
      }
    });

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const recentScans = await prisma.attendance.findMany({
      where: { eventId: id },
      orderBy: { attendanceTime: 'desc' },
      take: 10,
      include: {
        participant: true
      }
    });

    return NextResponse.json({
      event,
      registered: event._count.participants,
      present: event._count.attendance,
      absent: event._count.participants - event._count.attendance,
      recentScans
    });

  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
