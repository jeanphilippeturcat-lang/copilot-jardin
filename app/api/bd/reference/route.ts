import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getInfosImageReferenceLayout,
  lireImageBDDepuisUrl,
  sauvegarderImageReferenceLayout,
  supprimerImageReferenceLayout,
} from "@/lib/stockage";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
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
      await sauvegarderImageReferenceLayout(buffer);
      const referenceLayout = await getInfosImageReferenceLayout();
      return NextResponse.json({ referenceLayout }, { status: 201 });
    }

    const body = (await request.json().catch(() => null)) as { bdId?: string } | null;
    if (!body?.bdId) {
      return NextResponse.json({ error: "bdId ou fichier image requis" }, { status: 400 });
    }

    const bd = await prisma.bandeDessinee.findUnique({ where: { id: body.bdId } });
    if (!bd?.imageUrl) {
      return NextResponse.json(
        { error: "Cette édition ne contient pas encore d'image" },
        { status: 404 }
      );
    }

    const buffer = await lireImageBDDepuisUrl(bd.imageUrl);
    if (!buffer) {
      return NextResponse.json({ error: "Fichier image introuvable sur disque" }, { status: 404 });
    }

    await sauvegarderImageReferenceLayout(buffer);
    const referenceLayout = await getInfosImageReferenceLayout();
    return NextResponse.json({ referenceLayout }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erreur lors de la compression de l'image de référence",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  await supprimerImageReferenceLayout();
  return NextResponse.json({ referenceLayout: null });
}
