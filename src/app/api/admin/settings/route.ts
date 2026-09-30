import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.settings.findMany();
    const settingsObj = settings.reduce((acc, s) => {
      acc[s.key] = JSON.parse(s.value);
      return acc;
    }, {} as any);
    
    return NextResponse.json({ settings: settingsObj.rollNumberConfig || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
