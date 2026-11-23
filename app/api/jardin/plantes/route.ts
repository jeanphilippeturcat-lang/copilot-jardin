import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zoneId = searchParams.get("zoneId");

  const plantes = await prisma.plante.findMany({
    where: zoneId ? { zoneId } : undefined,
    include: { zone: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(plantes);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { nom, nomLatine, type, datePlantee, zoneId } = body;

  if (!nom || !type || !zoneId) {
    return NextResponse.json({ error: "nom, type et zoneId sont requis" }, { status: 400 });
  }

  const plante = await prisma.plante.create({
    data: {
      nom,
      nomLatine: nomLatine ?? null,
      type,
      datePlantee: datePlantee ? new Date(datePlantee) : null,
      zoneId,
    },
  });
  return NextResponse.json(plante, { status: 201 });
}
