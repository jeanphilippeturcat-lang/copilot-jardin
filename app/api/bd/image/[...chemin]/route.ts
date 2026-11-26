import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { mimeDepuisNomFichier, resoudreCheminImageBD } from "@/lib/stockage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ chemin: string[] }> }
) {
  const { chemin } = await context.params;
  const cheminDisque = resoudreCheminImageBD(chemin);

  if (!cheminDisque) {
    return NextResponse.json({ error: "Chemin d'image invalide" }, { status: 400 });
  }

  try {
    const buffer = await readFile(cheminDisque);
    const nomFichier = chemin[chemin.length - 1];
    const cacheControl =
      nomFichier === "reference-layout.jpg"
        ? "public, max-age=0, must-revalidate"
        : "public, max-age=31536000, immutable";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeDepuisNomFichier(nomFichier),
        "Cache-Control": cacheControl,
      },
    });
  } catch {
    return NextResponse.json({ error: "Image introuvable" }, { status: 404 });
  }
}
