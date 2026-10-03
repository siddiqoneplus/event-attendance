import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const attendance = await prisma.attendance.findMany({
      where: { eventId: id },
      orderBy: { attendanceTime: 'desc' },
      include: {
        participant: {
          select: {
            id: true,
            rollNumber: true,
            name: true,
            branch: true,
            section: true,
            admissionYear: true,
            academicYear: true,
          }
        }
      }
    });

    return NextResponse.json({ attendance });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
