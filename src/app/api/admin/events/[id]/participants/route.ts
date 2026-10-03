import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import crypto from 'crypto';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const participants = await prisma.eventParticipant.findMany({
      where: { eventId: id },
      include: { participant: true }
    });
    return NextResponse.json({ participants: participants.map((p: { participant: { name: string; rollNumber: string; branch: string | null; section: string | null } }) => p.participant) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { participants } = await request.json();

    let addedCount = 0;
    
    const rollNumbers = participants.map((p: any) => p.rollNumber);

    // 1. Fetch existing participants
    const existingParticipants = await prisma.participant.findMany({
      where: { rollNumber: { in: rollNumbers } }
    });

    const existingRolls = new Set(existingParticipants.map(p => p.rollNumber));

    // 2. Identify new participants
    const newParticipantsData = participants
      .filter((p: any) => !existingRolls.has(p.rollNumber))
      .map((p: any) => ({
        rollNumber: p.rollNumber,
        name: p.name,
        branch: p.branch,
        section: p.section,
        qrToken: crypto.randomBytes(16).toString('hex')
      }));

    // 3. Bulk insert new participants
    if (newParticipantsData.length > 0) {
      await prisma.participant.createMany({
        data: newParticipantsData
      });
    }

    // 4. Fetch all participants to get their IDs
    const allParticipants = await prisma.participant.findMany({
      where: { rollNumber: { in: rollNumbers } },
      select: { id: true, rollNumber: true }
    });

    // 5. Fetch existing event links
    const existingLinks = await prisma.eventParticipant.findMany({
      where: {
        eventId: id,
        participantId: { in: allParticipants.map(p => p.id) }
      },
      select: { participantId: true }
    });

    const existingLinkSet = new Set(existingLinks.map(l => l.participantId));

    // 6. Bulk insert missing event links
    const newLinksData = allParticipants
      .filter(p => !existingLinkSet.has(p.id))
      .map(p => ({
        eventId: id,
        participantId: p.id
      }));

    if (newLinksData.length > 0) {
      await prisma.eventParticipant.createMany({
        data: newLinksData
      });
    }
    
    addedCount = newLinksData.length;

    return NextResponse.json({ success: true, addedCount });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
