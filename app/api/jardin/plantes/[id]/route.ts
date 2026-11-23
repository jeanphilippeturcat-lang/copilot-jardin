import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plante = await prisma.plante.findUnique({
    where: { id },
    include: { zone: true, observations: { orderBy: { createdAt: "desc" } } },
  });
  if (!plante) return NextResponse.json({ error: "Plante introuvable" }, { status: 404 });
  return NextResponse.json(plante);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { nom, nomLatine, type, datePlantee, zoneId } = body;

  const plante = await prisma.plante.update({
    where: { id },
    data: {
      nom,
      nomLatine: nomLatine ?? null,
      type,
      datePlantee: datePlantee ? new Date(datePlantee) : null,
      zoneId,
    },
  });
  return NextResponse.json(plante);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.plante.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
