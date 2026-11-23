import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const observations = await prisma.observation.findMany({
    include: {
      plante: { select: { id: true, nom: true, zone: { select: { nom: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    observations.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
    }))
  );
}

export async function POST(request: Request) {
  const body = await request.json() as { planteId: string; note: string; photoUrl?: string };
  const { planteId, note, photoUrl } = body;

  if (!planteId || (!note?.trim() && !photoUrl)) {
    return NextResponse.json({ error: "planteId et au moins une note ou une photo sont requis" }, { status: 400 });
  }

  const observation = await prisma.observation.create({
    data: {
      planteId,
      note: note?.trim() ?? "",
      photoUrl: photoUrl ?? null,
    },
    include: {
      plante: { select: { id: true, nom: true, zone: { select: { nom: true } } } },
    },
  });

  return NextResponse.json({ ...observation, createdAt: observation.createdAt.toISOString() }, { status: 201 });
}
