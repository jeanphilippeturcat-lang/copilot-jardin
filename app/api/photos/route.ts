import { NextResponse } from "next/server";
import { sauvegarderPhoto } from "@/lib/stockage";

export async function POST(request: Request) {
  const formData = await request.formData();
  const fichier = formData.get("photo") as File | null;

  if (!fichier) {
    return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
  }

  const typesAcceptes = ["image/jpeg", "image/png", "image/webp"];
  if (!typesAcceptes.includes(fichier.type)) {
    return NextResponse.json({ error: "Format non supporté (jpg, png, webp uniquement)" }, { status: 400 });
  }

  if (fichier.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
  }

  const buffer = Buffer.from(await fichier.arrayBuffer());
  const url = await sauvegarderPhoto(buffer, fichier.type);

  return NextResponse.json({ url }, { status: 201 });
}
