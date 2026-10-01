import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
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
    
    // Remove the interactive transaction as it times out on MongoDB Free Tier with many sequential operations
    for (const row of participants) {
      try {
        // Upsert participant (create if not exists, update if exists)
        const participant = await prisma.participant.upsert({
          where: { rollNumber: row.rollNumber },
          update: {
            name: row.name,
            branch: row.branch,
            section: row.section,
          },
          create: {
            rollNumber: row.rollNumber,
            name: row.name,
            branch: row.branch,
            section: row.section,
            qrToken: crypto.randomBytes(16).toString('hex'),
          }
        });

        // Upsert event participant link
        const existingLink = await prisma.eventParticipant.findUnique({
          where: {
            eventId_participantId: {
              eventId: id,
              participantId: participant.id
            }
          }
        });

        if (!existingLink) {
          await prisma.eventParticipant.create({
            data: {
              eventId: id,
              participantId: participant.id
            }
          });
          addedCount++;
        }
      } catch (err) {
        console.error(`Failed to process row: ${row.rollNumber}`, err);
        // Continue with the next row even if one fails
      }
    }

    return NextResponse.json({ success: true, addedCount });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
