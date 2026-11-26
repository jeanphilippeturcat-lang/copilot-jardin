import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sauvegarderImageBD, supprimerImageBD } from "@/lib/stockage";
import { serialiserBandeDessinee } from "@/lib/bd-generateur";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const existante = await prisma.bandeDessinee.findUnique({ where: { id } });

  if (!existante) {
    return NextResponse.json({ error: "Édition BD introuvable" }, { status: 404 });
  }

  const formData = await request.formData();
  const fichier = formData.get("image") as File | null;

  if (!fichier) {
    return NextResponse.json({ error: "Aucune image reçue" }, { status: 400 });
  }

  const typesAcceptes = ["image/jpeg", "image/png", "image/webp"];
  if (!typesAcceptes.includes(fichier.type)) {
    return NextResponse.json(
      { error: "Format non supporté (png, jpg ou webp uniquement)" },
      { status: 400 }
    );
  }

  if (fichier.size > 15 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Image trop volumineuse (max 15 Mo)" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await fichier.arrayBuffer());
  const nouvelleUrl = await sauvegarderImageBD(
    existante.semaineCle,
    buffer,
    fichier.type
  );

  const ancienneUrl = existante.imageUrl;

  const maj = await prisma.bandeDessinee.update({
    where: { id },
    data: {
      imageUrl: nouvelleUrl,
      modeleImage: "import-manuel",
      batchJobName: null,
      batchStatut: null,
    },
  });

  if (ancienneUrl && ancienneUrl !== nouvelleUrl) {
    await supprimerImageBD(ancienneUrl);
  }

  return NextResponse.json({ bd: serialiserBandeDessinee(maj) }, { status: 201 });
}
