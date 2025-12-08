import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

// GET /api/studio/projects/[id] - Get a specific project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!prisma) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 503 }
      );
    }

    const { id } = await params;

    const project = await prisma.studioProject.findUnique({
      where: {
        id,
        userId: token.sub,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error fetching studio project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PUT /api/studio/projects/[id] - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!prisma) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 503 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, sceneData, thumbnail } = body;

    // Verify the project belongs to the user
    const existingProject = await prisma.studioProject.findUnique({
      where: {
        id,
        userId: token.sub,
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const project = await prisma.studioProject.update({
      where: {
        id,
      },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(sceneData && { sceneData }),
        ...(thumbnail !== undefined && { thumbnail }),
      },
    });

    console.log(`[Studio API] Project updated: ${project.id} - ${project.name}`);

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error updating studio project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/studio/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!prisma) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 503 }
      );
    }

    const { id } = await params;

    // Verify the project belongs to the user
    const existingProject = await prisma.studioProject.findUnique({
      where: {
        id,
        userId: token.sub,
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    await prisma.studioProject.delete({
      where: {
        id,
      },
    });

    console.log(`[Studio API] Project deleted: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting studio project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
