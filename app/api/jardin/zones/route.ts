import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const zones = await prisma.zone.findMany({
    include: {
      plantes: {
        include: {
          observations: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const zonesAvecDerniereObs = zones.map((zone) => ({
    ...zone,
    plantes: zone.plantes.map(({ observations, ...plante }) => ({
      ...plante,
      derniereObservation: observations[0]?.createdAt.toISOString() ?? null,
    })),
  }));

  return NextResponse.json(zonesAvecDerniereObs);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { nom, type, surface, exposition } = body;

  if (!nom || !type) {
    return NextResponse.json({ error: "nom et type sont requis" }, { status: 400 });
  }

  const zone = await prisma.zone.create({
    data: { nom, type, surface: surface ?? null, exposition: exposition ?? null },
  });
  return NextResponse.json(zone, { status: 201 });
}
