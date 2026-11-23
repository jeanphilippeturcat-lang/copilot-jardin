import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const zone = await prisma.zone.findUnique({
    where: { id },
    include: { plantes: { orderBy: { createdAt: "asc" } } },
  });
  if (!zone) return NextResponse.json({ error: "Zone introuvable" }, { status: 404 });
  return NextResponse.json(zone);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { nom, type, surface, exposition } = body;

  const zone = await prisma.zone.update({
    where: { id },
    data: { nom, type, surface: surface ?? null, exposition: exposition ?? null },
  });
  return NextResponse.json(zone);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.zone.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
