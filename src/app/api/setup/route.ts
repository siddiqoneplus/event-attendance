import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const adminExists = await prisma.user.findUnique({
      where: { username: 'admin' },
    });

    if (!adminExists) {
      const passwordHash = await bcrypt.hash('admin', 10);
      await prisma.user.create({
        data: {
          name: 'Super Admin',
          username: 'admin',
          email: 'admin@example.com',
          password_hash: passwordHash,
          role: 'ADMIN',
        },
      });
    }

    const employeeExists = await prisma.user.findUnique({
      where: { username: 'employee1' },
    });

    if (!employeeExists) {
      const passwordHash = await bcrypt.hash('employee1', 10);
      await prisma.user.create({
        data: {
          name: 'Staff Member 1',
          username: 'employee1',
          email: 'employee1@example.com',
          password_hash: passwordHash,
          role: 'EMPLOYEE',
        },
      });
    }

    return NextResponse.json({ message: 'Setup complete' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
