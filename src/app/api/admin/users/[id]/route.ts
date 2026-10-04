import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { name, username, email, role, status, password } = data;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (username) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: { username, NOT: { id } },
      });
      if (existingUser) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
