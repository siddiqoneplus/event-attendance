import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const user = verifyToken(token!);

    if (!user || user.role !== 'EMPLOYEE') {
      // Actually admin should also be able to scan or manually mark, but let's allow both
      if (!user || !['EMPLOYEE', 'ADMIN'].includes(user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { eventId, scannedData } = await request.json();

    // scannedData could be a JSON or a roll number. Let's assume the QR contains the roll number.
    const rollNumber = scannedData.trim();

    // 1. Is event active?
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return NextResponse.json({ error: 'Event not found', status: 'INVALID' }, { status: 404 });
    if (event.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Attendance is currently closed. Event is not active.', status: 'EVENT_CLOSED' }, { status: 400 });
    }

    // Check time window (optional but requested)
    // For simplicity, we just rely on event.status === 'ACTIVE' which the admin controls.
    
    // 2. Does the roll number exist in the participant list?
    const participant = await prisma.participant.findUnique({
      where: { rollNumber }
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found in database.', status: 'INVALID' }, { status: 404 });
    }

    // Is participant in this event's roster?
    const eventParticipant = await prisma.eventParticipant.findUnique({
      where: {
        eventId_participantId: {
          eventId: event.id,
          participantId: participant.id
        }
      }
    });

    if (!eventParticipant) {
      return NextResponse.json({ 
        error: 'Attendance rejected. This participant is not registered for this event.',
        status: 'NOT_REGISTERED'
      }, { status: 403 });
    }

    // 3. Is already marked?
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        eventId_participantId: {
          eventId: event.id,
          participantId: participant.id
        }
      }
    });

    if (existingAttendance) {
      return NextResponse.json({ 
        error: 'Attendance already recorded.',
        status: 'DUPLICATE',
        participant: {
          name: participant.name,
          rollNumber: participant.rollNumber,
          branch: participant.branch,
          section: participant.section,
          scanTime: existingAttendance.attendanceTime
        }
      }, { status: 409 });
    }

    // 4. Mark attendance
    const attendance = await prisma.attendance.create({
      data: {
        eventId: event.id,
        participantId: participant.id,
        scannedBy: user.id,
        deviceInfo: request.headers.get('user-agent') || 'Unknown',
        scanStatus: 'PRESENT'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Attendance Marked Successfully',
      status: 'SUCCESS',
      participant: {
        name: participant.name,
        rollNumber: participant.rollNumber,
        branch: participant.branch,
        section: participant.section,
        scanTime: attendance.attendanceTime
      }
    });

  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
