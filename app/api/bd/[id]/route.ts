import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supprimerImageBD } from "@/lib/stockage";
import { serialiserBandeDessinee } from "@/lib/bd-generateur";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const existante = await prisma.bandeDessinee.findUnique({ where: { id } });

  if (!existante) {
    return NextResponse.json({ error: "Bande dessinée introuvable" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    promptImage?: string;
  } | null;

  if (!body || typeof body.promptImage !== "string" || !body.promptImage.trim()) {
    return NextResponse.json({ error: "promptImage requis" }, { status: 400 });
  }

  const maj = await prisma.bandeDessinee.update({
    where: { id },
    data: { promptImage: body.promptImage.trim() },
  });

  return NextResponse.json({ bd: serialiserBandeDessinee(maj) });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const existante = await prisma.bandeDessinee.findUnique({ where: { id } });

  if (!existante) {
    return NextResponse.json({ error: "Bande dessinée introuvable" }, { status: 404 });
  }

  await prisma.bandeDessinee.delete({ where: { id } });
  if (existante.imageUrl) {
    await supprimerImageBD(existante.imageUrl);
  }

  return NextResponse.json({ ok: true });
}
