import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supprimerPhoto } from "@/lib/stockage";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const observation = await prisma.observation.findUnique({ where: { id } });
  if (!observation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (observation.photoUrl) await supprimerPhoto(observation.photoUrl);

  await prisma.observation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as { diagnostic: string };

  const observation = await prisma.observation.update({
    where: { id },
    data: { diagnostic: body.diagnostic },
    include: {
      plante: { select: { id: true, nom: true, zone: { select: { nom: true } } } },
    },
  });

  return NextResponse.json({ ...observation, createdAt: observation.createdAt.toISOString() });
}
