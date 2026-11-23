import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { statut, dateEcheance } = body;

  const data: { statut?: string; dateEcheance?: Date } = {};

  if (statut !== undefined) {
    const statutsValides = ["a_faire", "faite", "ignoree"];
    if (!statutsValides.includes(statut)) {
      return NextResponse.json({ error: "statut invalide" }, { status: 400 });
    }
    data.statut = statut;
  }

  if (dateEcheance !== undefined) {
    data.dateEcheance = new Date(dateEcheance);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "aucun champ à mettre à jour" }, { status: 400 });
  }

  const tache = await prisma.tache.update({
    where: { id },
    data,
  });

  return NextResponse.json(tache);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.tache.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
