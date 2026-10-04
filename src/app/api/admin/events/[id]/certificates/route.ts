import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: returns event info + all present attendees
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    // Fetch all attendees marked present
    const attendance = await prisma.attendance.findMany({
      where: { eventId: id, scanStatus: 'PRESENT' },
      include: {
        participant: {
          select: { id: true, rollNumber: true, name: true, branch: true, section: true }
        }
      },
      orderBy: { participant: { name: 'asc' } }
    });

    // Fetch saved certificate config for this event
    const configKey = `cert_config_${id}`;
    const savedConfig = await prisma.settings.findUnique({ where: { key: configKey } });

    return NextResponse.json({
      event,
      presentCount: attendance.length,
      attendees: attendance.map(a => a.participant),
      certConfig: savedConfig ? JSON.parse(savedConfig.value) : null
    });

  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// POST: save certificate config (template + text settings) for this event
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const config = await request.json();
    const configKey = `cert_config_${id}`;

    await prisma.settings.upsert({
      where: { key: configKey },
      update: { value: JSON.stringify(config) },
      create: { key: configKey, value: JSON.stringify(config) }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
