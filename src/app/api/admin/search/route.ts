import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const user = verifyToken(token!);

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';

    if (q.length < 1) {
      return NextResponse.json({ events: [], participants: [], users: [] });
    }

    const [events, participants, users] = await Promise.all([
      prisma.event.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { eventId: { contains: q, mode: 'insensitive' } },
            { venue: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          eventId: true,
          name: true,
          venue: true,
          status: true,
          date: true,
        },
        take: 5,
      }),

      prisma.participant.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { rollNumber: { contains: q, mode: 'insensitive' } },
            { branch: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          rollNumber: true,
          branch: true,
          section: true,
        },
        take: 5,
      }),

      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          status: true,
        },
        take: 5,
      }),
    ]);

    return NextResponse.json({ events, participants, users });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
