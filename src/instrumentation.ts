/**
 * Next.js Instrumentation Hook
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * This file runs ONCE when the Next.js server starts.
 * We use it to start a lightweight in-process scheduler that polls for
 * events whose scheduled activate/deactivate time has passed.
 *
 * The scheduler calls the /api/cron/schedule-events endpoint every 60 seconds.
 * This works for self-hosted / local deployments. For Vercel, use Vercel Cron Jobs.
 */
export async function register() {
  // Only run in the Node.js runtime (not in Edge or during build)
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Avoid double-registration in dev hot-reload cycles
  const globalAny = global as Record<string, unknown>;
  if (globalAny.__schedulerStarted) return;
  globalAny.__schedulerStarted = true;

  const INTERVAL_MS = 60 * 1000; // 1 minute

  async function tick() {
    try {
      const { prisma } = await import('@/lib/prisma');
      const now = new Date();

      // Auto-activate
      const toActivate = await prisma.event.findMany({
        where: { scheduledActivateAt: { lte: now }, status: { in: ['DRAFT', 'UPCOMING'] } },
        select: { id: true, name: true },
      });
      for (const event of toActivate) {
        await prisma.event.update({ where: { id: event.id }, data: { status: 'ACTIVE' } });
        console.log(`[Scheduler] ✅ Auto-activated: "${event.name}"`);
      }

      // Auto-deactivate
      const toDeactivate = await prisma.event.findMany({
        where: { scheduledDeactivateAt: { lte: now }, status: 'ACTIVE' },
        select: { id: true, name: true },
      });
      for (const event of toDeactivate) {
        await prisma.event.update({ where: { id: event.id }, data: { status: 'COMPLETED' } });
        console.log(`[Scheduler] ⏹  Auto-completed: "${event.name}"`);
      }
    } catch (err) {
      console.error('[Scheduler] Error during tick:', err);
    }
  }

  // Run immediately on startup, then every minute
  tick();
  setInterval(tick, INTERVAL_MS);

  console.log('[Scheduler] 🕐 Event auto-scheduler started (interval: 60s)');
}
