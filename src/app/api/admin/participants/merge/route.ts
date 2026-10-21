import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

/**
 * POST /api/admin/participants/merge
 *
 * Body: { masterId: string, duplicateIds: string[] }
 *
 * Merge strategy:
 *  1. For each duplicate participant:
 *     a. Transfer EventParticipant links to master (skip if master already linked to that event)
 *     b. Transfer Attendance records to master (skip if master already has attendance for that event)
 *     c. Delete the duplicate Participant record
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const user = verifyToken(token!);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { masterId, duplicateIds } = await request.json() as {
      masterId: string;
      duplicateIds: string[];
    };

    if (!masterId || !duplicateIds?.length) {
      return NextResponse.json({ error: 'masterId and duplicateIds are required' }, { status: 400 });
    }

    if (duplicateIds.includes(masterId)) {
      return NextResponse.json({ error: 'masterId cannot be in duplicateIds' }, { status: 400 });
    }

    // Verify master exists
    const master = await prisma.participant.findUnique({ where: { id: masterId } });
    if (!master) return NextResponse.json({ error: 'Master participant not found' }, { status: 404 });

    // Fetch existing master event links to avoid constraint violations
    const masterLinks = await prisma.eventParticipant.findMany({
      where: { participantId: masterId },
      select: { eventId: true },
    });
    const masterEventIds = new Set(masterLinks.map(l => l.eventId));

    // Fetch existing master attendance to avoid constraint violations
    const masterAttendance = await prisma.attendance.findMany({
      where: { participantId: masterId },
      select: { eventId: true },
    });
    const masterAttendedEventIds = new Set(masterAttendance.map(a => a.eventId));

    let eventsTransferred = 0;
    let attendanceTransferred = 0;
    let participantsDeleted = 0;

    for (const dupId of duplicateIds) {
      const dup = await prisma.participant.findUnique({ where: { id: dupId } });
      if (!dup) continue;

      // — Transfer EventParticipant links —
      const dupLinks = await prisma.eventParticipant.findMany({
        where: { participantId: dupId },
        select: { id: true, eventId: true },
      });

      for (const link of dupLinks) {
        if (masterEventIds.has(link.eventId)) {
          // Master already linked to this event — just delete the duplicate link
          await prisma.eventParticipant.delete({ where: { id: link.id } });
        } else {
          // Transfer link to master
          await prisma.eventParticipant.update({
            where: { id: link.id },
            data: { participantId: masterId },
          });
          masterEventIds.add(link.eventId);
          eventsTransferred++;
        }
      }

      // — Transfer Attendance records —
      const dupAttendance = await prisma.attendance.findMany({
        where: { participantId: dupId },
        select: { id: true, eventId: true },
      });

      for (const att of dupAttendance) {
        if (masterAttendedEventIds.has(att.eventId)) {
          // Master already has attendance for this event — drop the duplicate
          await prisma.attendance.delete({ where: { id: att.id } });
        } else {
          // Transfer to master
          await prisma.attendance.update({
            where: { id: att.id },
            data: { participantId: masterId },
          });
          masterAttendedEventIds.add(att.eventId);
          attendanceTransferred++;
        }
      }

      // — Delete duplicate participant —
      await prisma.participant.delete({ where: { id: dupId } });
      participantsDeleted++;
    }

    return NextResponse.json({
      success: true,
      master: { id: master.id, name: master.name, rollNumber: master.rollNumber },
      eventsTransferred,
      attendanceTransferred,
      participantsDeleted,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
