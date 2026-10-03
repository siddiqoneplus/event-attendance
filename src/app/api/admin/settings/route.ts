import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.settings.findMany();
    const settingsObj = settings.reduce((acc: Record<string, unknown>, s) => {
      try { acc[s.key] = JSON.parse(s.value); } catch { acc[s.key] = s.value; }
      return acc;
    }, {});
    
    return NextResponse.json({ settings: settingsObj.rollNumberConfig || null });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { settings } = await request.json();
    
    await prisma.settings.upsert({
      where: { key: 'rollNumberConfig' },
      update: { value: JSON.stringify(settings) },
      create: { key: 'rollNumberConfig', value: JSON.stringify(settings) }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
