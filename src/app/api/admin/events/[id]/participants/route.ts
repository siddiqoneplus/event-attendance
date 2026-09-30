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
    return NextResponse.json({ participants: participants.map(p => p.participant) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { participants } = await request.json();

    let addedCount = 0;
    
    // Using a transaction for bulk insert
    await prisma.$transaction(async (tx) => {
      for (const row of participants) {
        // Find or create participant
        let participant = await tx.participant.findUnique({
          where: { rollNumber: row.rollNumber }
        });

        if (!participant) {
          participant = await tx.participant.create({
            data: {
              rollNumber: row.rollNumber,
              name: row.name,
              branch: row.branch,
              section: row.section,
              qrToken: crypto.randomBytes(16).toString('hex'),
            }
          });
        }

        // Add to event if not already added
        const existingEventParticipant = await tx.eventParticipant.findUnique({
          where: {
            eventId_participantId: {
              eventId: id,
              participantId: participant.id
            }
          }
        });

        if (!existingEventParticipant) {
          await tx.eventParticipant.create({
            data: {
              eventId: id,
              participantId: participant.id
            }
          });
          addedCount++;
        }
      }
    });

    return NextResponse.json({ success: true, addedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
