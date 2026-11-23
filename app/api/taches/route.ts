import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statut = searchParams.get("statut"); // a_faire | faite | ignoree

  const taches = await prisma.tache.findMany({
    where: statut ? { statut } : undefined,
    include: { plante: { select: { nom: true, zoneId: true } } },
    orderBy: [{ dateEcheance: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(taches);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { titre, description, type, dateEcheance, planteId, source } = body;

  if (!titre || !type) {
    return NextResponse.json({ error: "titre et type sont requis" }, { status: 400 });
  }

  const tache = await prisma.tache.create({
    data: {
      titre,
      description: description ?? null,
      type,
      dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
      planteId: planteId ?? null,
      source: source ?? "manuelle",
    },
  });

  return NextResponse.json(tache, { status: 201 });
}
