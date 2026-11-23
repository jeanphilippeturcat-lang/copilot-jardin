import { writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const DOSSIER_UPLOADS = path.join(process.cwd(), "public", "uploads");

export async function sauvegarderPhoto(buffer: Buffer, mimeType: string): Promise<string> {
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const nomFichier = `${randomUUID()}.${ext}`;
  const cheminComplet = path.join(DOSSIER_UPLOADS, nomFichier);
  await writeFile(cheminComplet, buffer);
  return `/uploads/${nomFichier}`;
}

export async function supprimerPhoto(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return;
  const nomFichier = url.replace("/uploads/", "");
  const cheminComplet = path.join(DOSSIER_UPLOADS, nomFichier);
  await unlink(cheminComplet).catch(() => {});
}
