import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/participants/[id]
 * Returns full participant profile: bio + all event registrations + attendance records.
 */
export async function GET(_req: Request, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const user = verifyToken(token!);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const participant = await prisma.participant.findUnique({
      where: { id },
      select: {
        id: true,
        rollNumber: true,
        name: true,
        branch: true,
        section: true,
        admissionYear: true,
        academicYear: true,
        qrToken: true,
        createdAt: true,
        events: {
          include: {
            event: {
              select: {
                id: true,
                eventId: true,
                name: true,
                date: true,
                startTime: true,
                endTime: true,
                venue: true,
                status: true,
              },
            },
          },
          orderBy: { event: { date: 'desc' } },
        },
        attendance: {
          include: {
            event: {
              select: {
                id: true,
                eventId: true,
                name: true,
                date: true,
              },
            },
          },
          orderBy: { attendanceTime: 'desc' },
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Build enriched events list with attendance status
    const attendedEventIds = new Set(participant.attendance.map(a => a.event.id));

    const enrichedEvents = participant.events.map(ep => ({
      ...ep.event,
      attended: attendedEventIds.has(ep.event.id),
      attendanceTime: participant.attendance.find(a => a.event.id === ep.event.id)?.attendanceTime ?? null,
    }));

    return NextResponse.json({
      participant: {
        id: participant.id,
        rollNumber: participant.rollNumber,
        name: participant.name,
        branch: participant.branch,
        section: participant.section,
        admissionYear: participant.admissionYear,
        academicYear: participant.academicYear,
        createdAt: participant.createdAt,
        totalEvents: participant.events.length,
        totalAttended: participant.attendance.length,
        attendanceRate: participant.events.length > 0
          ? Math.round((participant.attendance.length / participant.events.length) * 100)
          : 0,
        events: enrichedEvents,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
