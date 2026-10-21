import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

/**
 * POST /api/cron/schedule-events
 *
 * Checks all events with scheduling fields and transitions their status:
 *   - scheduledActivateAt   <= now  AND status is DRAFT/UPCOMING  → ACTIVE
 *   - scheduledDeactivateAt <= now  AND status is ACTIVE           → COMPLETED
 *
 * Call this endpoint from an external cron service (e.g. cron-job.org) every minute,
 * OR it is also called internally from the Next.js instrumentation hook every 60 s.
 *
 * Protect with a shared secret via the Authorization header:
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: Request) {
  // Verify cron secret (skip check in development if not set)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return runScheduler();
}

/**
 * GET variant — callable by admin users from the UI (manual trigger).
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const user = verifyToken(token!);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return runScheduler();
}

export async function runScheduler() {
  const now = new Date();
  const activated: string[] = [];
  const deactivated: string[] = [];

  try {
    // Auto-activate: DRAFT or UPCOMING events whose activate time has passed
    const toActivate = await prisma.event.findMany({
      where: {
        scheduledActivateAt: { lte: now },
        status: { in: ['DRAFT', 'UPCOMING'] },
      },
      select: { id: true, name: true },
    });

    for (const event of toActivate) {
      await prisma.event.update({
        where: { id: event.id },
        data: { status: 'ACTIVE' },
      });
      activated.push(event.name);
    }

    // Auto-deactivate: ACTIVE events whose deactivate time has passed
    const toDeactivate = await prisma.event.findMany({
      where: {
        scheduledDeactivateAt: { lte: now },
        status: 'ACTIVE',
      },
      select: { id: true, name: true },
    });

    for (const event of toDeactivate) {
      await prisma.event.update({
        where: { id: event.id },
        data: { status: 'COMPLETED' },
      });
      deactivated.push(event.name);
    }

    return NextResponse.json({
      ok: true,
      checkedAt: now.toISOString(),
      activated,
      deactivated,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scheduler error' },
      { status: 500 }
    );
  }
}
