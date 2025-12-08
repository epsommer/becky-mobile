// API endpoint to initialize the admin user from environment variables
// This should only be called once to set up the initial admin user
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Security: Only allow this in production setup or with special header
    const initKey = request.headers.get('x-init-key');
    const expectedKey = process.env.INIT_KEY || 'allow-init';

    if (initKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid initialization key' },
        { status: 401 }
      );
    }

    // Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: 'ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables'
        },
        { status: 500 }
      );
    }

    // Check if admin user already exists
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email: adminEmail.toLowerCase().trim() }
    });

    if (existingAdmin) {
      return NextResponse.json(
        {
          message: 'Admin user already exists',
          email: adminEmail
        },
        { status: 200 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create the admin user
    const adminUser = await prisma.adminUser.create({
      data: {
        email: adminEmail.toLowerCase().trim(),
        passwordHash,
        name: 'System Administrator',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });

    console.log('✅ Admin user created:', adminUser.email);

    return NextResponse.json(
      {
        success: true,
        message: 'Admin user created successfully',
        email: adminUser.email,
        id: adminUser.id
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    return NextResponse.json(
      {
        error: 'Failed to create admin user',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
