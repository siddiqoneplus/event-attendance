import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

type Params = { params: Promise<{ id: string }> };

/** GET — returns the current schedule for an event */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const user = verifyToken(token!);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await prisma.event.findUnique({
      where: { id },
      select: { scheduledActivateAt: true, scheduledDeactivateAt: true, status: true },
    });

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ schedule: event });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

/** PATCH — save or clear schedule fields for an event */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const user = verifyToken(token!);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { scheduledActivateAt, scheduledDeactivateAt } = body;

    const event = await prisma.event.update({
      where: { id },
      data: {
        scheduledActivateAt: scheduledActivateAt ? new Date(scheduledActivateAt) : null,
        scheduledDeactivateAt: scheduledDeactivateAt ? new Date(scheduledDeactivateAt) : null,
      },
      select: { id: true, status: true, scheduledActivateAt: true, scheduledDeactivateAt: true },
    });

    return NextResponse.json({ event });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
