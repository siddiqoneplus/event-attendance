import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const totalEvents = await prisma.event.count();
    const activeEvents = await prisma.event.count({ where: { status: 'ACTIVE' } });
    const totalParticipants = await prisma.participant.count();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysAttendance = await prisma.attendance.count({
      where: {
        attendanceTime: {
          gte: today,
        }
      }
    });

    const totalExpected = await prisma.eventParticipant.count();
    const totalAttended = await prisma.attendance.count();
    const attendancePercentage = totalExpected > 0 ? Math.round((totalAttended / totalExpected) * 100) : 0;

    return NextResponse.json({
      totalEvents,
      activeEvents,
      totalParticipants,
      todaysAttendance,
      attendancePercentage,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
