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
    return NextResponse.json({ participants: participants.map((p: { participant: { id: string; name: string; rollNumber: string; branch: string | null; section: string | null; admissionYear: number | null; academicYear: string | null } }) => p.participant) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

interface CsvParticipant {
  rollNumber: string;
  name: string;
  branch: string | null;
  section: string | null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const rawParticipants: CsvParticipant[] = body.participants;
    
    // Sanitize and normalize all incoming participants
    const participants = rawParticipants.map(p => ({
      rollNumber: p.rollNumber.trim().toUpperCase(),
      name: p.name.trim(),
      branch: p.branch?.trim() || null,
      section: p.section?.trim() || null
    })).filter(p => p.rollNumber && p.name);

    let addedCount = 0;
    
    const rollNumbers = participants.map((p: CsvParticipant) => p.rollNumber);

    // 1. Fetch existing participants
    const existingParticipants = await prisma.participant.findMany({
      where: { rollNumber: { in: rollNumbers } }
    });

    const existingRolls = new Set(existingParticipants.map((p: { rollNumber: string }) => p.rollNumber));

    // 2. Identify new participants
    const newParticipantsData = participants
      .filter((p: CsvParticipant) => !existingRolls.has(p.rollNumber))
      .map((p: CsvParticipant) => ({
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
        participantId: { in: allParticipants.map((p: { id: string }) => p.id) }
      },
      select: { participantId: true }
    });

    const existingLinkSet = new Set(existingLinks.map((l: { participantId: string }) => l.participantId));

    // 6. Bulk insert missing event links
    const newLinksData = allParticipants
      .filter((p: { id: string }) => !existingLinkSet.has(p.id))
      .map((p: { id: string }) => ({
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
