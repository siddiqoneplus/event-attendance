import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

/**
 * GET /api/admin/participants/duplicates
 *
 * Detects potential duplicate participants by grouping on:
 *   1. Identical normalised name  (lowercase, collapsed whitespace, trimmed)
 *   2. Identical roll number prefix (first N chars) — catches typos like trailing letters
 *
 * Returns groups of 2+ participants that look like duplicates.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const user = verifyToken(token!);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const all = await prisma.participant.findMany({
      select: {
        id: true,
        rollNumber: true,
        name: true,
        branch: true,
        section: true,
        createdAt: true,
        _count: { select: { events: true, attendance: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by normalised name
    const byName = new Map<string, typeof all>();
    for (const p of all) {
      const key = p.name.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key)!.push(p);
    }

    const groups: {
      key: string;
      reason: string;
      participants: typeof all;
    }[] = [];

    for (const [key, members] of byName.entries()) {
      if (members.length >= 2) {
        groups.push({ key, reason: 'Same name', participants: members });
      }
    }

    // Also catch groups with identical normalised roll number prefix (≥8 chars)
    // (handles trailing-char typos like "21A91A0501" vs "21A91A0501A")
    const PREFIX_LEN = 8;
    const byRollPrefix = new Map<string, typeof all>();
    for (const p of all) {
      const key = p.rollNumber.slice(0, PREFIX_LEN).toUpperCase();
      if (!byRollPrefix.has(key)) byRollPrefix.set(key, []);
      byRollPrefix.get(key)!.push(p);
    }

    for (const [key, members] of byRollPrefix.entries()) {
      if (members.length >= 2) {
        // Only add if NOT already covered by a name-group
        const ids = new Set(members.map(m => m.id));
        const alreadyCovered = groups.some(g =>
          g.participants.some(p => ids.has(p.id)) &&
          members.every(m => g.participants.some(p => p.id === m.id))
        );
        if (!alreadyCovered) {
          groups.push({ key, reason: `Similar roll number (prefix: ${key})`, participants: members });
        }
      }
    }

    return NextResponse.json({ groups, totalParticipants: all.length });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
