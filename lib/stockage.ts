import { writeFile, unlink, mkdir, readFile, access, stat } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";

const DOSSIER_UPLOADS = path.join(process.cwd(), "public", "uploads");
const DOSSIER_BD = path.join(DOSSIER_UPLOADS, "bd");
const DOSSIER_BD_PERSONNAGES = path.join(DOSSIER_BD, "personnages");
const NOM_REFERENCE_LAYOUT = "reference-layout.jpg";

function extensionDepuisMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export function mimeDepuisNomFichier(nomFichier: string): string {
  const lower = nomFichier.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function sauvegarderPhoto(buffer: Buffer, mimeType: string): Promise<string> {
  await mkdir(DOSSIER_UPLOADS, { recursive: true });
  const ext = extensionDepuisMime(mimeType);
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

export async function sauvegarderImageBD(
  semaineCle: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  await mkdir(DOSSIER_BD, { recursive: true });
  const ext = extensionDepuisMime(mimeType);
  const clePropre = semaineCle.replace(/[^a-zA-Z0-9_-]/g, "");
  const nomFichier = `${clePropre}-${randomUUID().slice(0, 8)}.${ext}`;
  const cheminComplet = path.join(DOSSIER_BD, nomFichier);
  await writeFile(cheminComplet, buffer);
  return `/api/bd/image/${nomFichier}`;
}

export async function supprimerImageBD(url: string): Promise<void> {
  const prefix = "/api/bd/image/";
  if (!url.startsWith(prefix)) return;
  const relatif = url.slice(prefix.length);
  if (
    !relatif ||
    relatif.includes("/") ||
    relatif.includes("..") ||
    relatif === NOM_REFERENCE_LAYOUT
  ) {
    return;
  }
  const cheminComplet = path.join(DOSSIER_BD, path.basename(relatif));
  await unlink(cheminComplet).catch(() => {});
}

export async function lireImageBDDepuisUrl(url: string): Promise<Buffer | null> {
  const prefix = "/api/bd/image/";
  if (!url.startsWith(prefix)) return null;
  const segments = url.slice(prefix.length).split("/").filter(Boolean);
  const chemin = resoudreCheminImageBD(segments);
  if (!chemin) return null;
  try {
    return await readFile(chemin);
  } catch {
    return null;
  }
}

/**
 * Compresse une image de référence en JPEG léger (max 1024px, qualité 72, mozjpeg)
 * pour minimiser les tokens d'entrée lors des appels stateless Gemini.
 */
export async function compresserReferenceJpeg(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer();
}

export async function sauvegarderImageReferenceLayout(
  buffer: Buffer
): Promise<{ url: string; tailleOctets: number }> {
  await mkdir(DOSSIER_BD, { recursive: true });
  const compresse = await compresserReferenceJpeg(buffer);
  const cheminComplet = path.join(DOSSIER_BD, NOM_REFERENCE_LAYOUT);
  await writeFile(cheminComplet, compresse);
  return {
    url: `/api/bd/image/${NOM_REFERENCE_LAYOUT}`,
    tailleOctets: compresse.length,
  };
}

export async function lireImageReferenceLayout(): Promise<{
  buffer: Buffer;
  mimeType: "image/jpeg";
  url: string;
  tailleOctets: number;
} | null> {
  const cheminComplet = path.join(DOSSIER_BD, NOM_REFERENCE_LAYOUT);
  try {
    const buffer = await readFile(cheminComplet);
    return {
      buffer,
      mimeType: "image/jpeg",
      url: `/api/bd/image/${NOM_REFERENCE_LAYOUT}`,
      tailleOctets: buffer.length,
    };
  } catch {
    return null;
  }
}

export async function getInfosImageReferenceLayout(): Promise<{
  url: string;
  tailleOctets: number;
} | null> {
  const cheminComplet = path.join(DOSSIER_BD, NOM_REFERENCE_LAYOUT);
  try {
    const info = await stat(cheminComplet);
    return {
      url: `/api/bd/image/${NOM_REFERENCE_LAYOUT}?v=${Math.floor(info.mtimeMs)}`,
      tailleOctets: info.size,
    };
  } catch {
    return null;
  }
}

export async function supprimerImageReferenceLayout(): Promise<void> {
  const cheminComplet = path.join(DOSSIER_BD, NOM_REFERENCE_LAYOUT);
  await unlink(cheminComplet).catch(() => {});
}

export async function lirePortraitPersonnage(
  personnageId: string
): Promise<{ buffer: Buffer; mimeType: string; url: string } | null> {
  const idPropre = personnageId.replace(/[^a-z0-9-]/g, "");
  const extensions = ["png", "webp", "jpg"];
  for (const ext of extensions) {
    const nomFichier = `${idPropre}.${ext}`;
    const cheminComplet = path.join(DOSSIER_BD_PERSONNAGES, nomFichier);
    try {
      const buffer = await readFile(cheminComplet);
      return {
        buffer,
        mimeType: mimeDepuisNomFichier(nomFichier),
        url: `/api/bd/image/personnages/${nomFichier}`,
      };
    } catch {
      // Essaye l'extension suivante
    }
  }
  return null;
}

export async function getUrlPortraitPersonnageSiExistant(
  personnageId: string
): Promise<string | null> {
  const idPropre = personnageId.replace(/[^a-z0-9-]/g, "");
  const extensions = ["png", "webp", "jpg"];
  for (const ext of extensions) {
    const nomFichier = `${idPropre}.${ext}`;
    const cheminComplet = path.join(DOSSIER_BD_PERSONNAGES, nomFichier);
    try {
      await access(cheminComplet);
      return `/api/bd/image/personnages/${nomFichier}`;
    } catch {
      // Continue
    }
  }
  return null;
}

export async function sauvegarderPortraitPersonnage(
  personnageId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  await mkdir(DOSSIER_BD_PERSONNAGES, { recursive: true });
  const idPropre = personnageId.replace(/[^a-z0-9-]/g, "");
  const ext = extensionDepuisMime(mimeType);
  const nomFichier = `${idPropre}.${ext}`;
  const cheminComplet = path.join(DOSSIER_BD_PERSONNAGES, nomFichier);
  await writeFile(cheminComplet, buffer);
  return `/api/bd/image/personnages/${nomFichier}`;
}

/**
 * Résout de manière sécurisée le chemin sur disque pour l'API /api/bd/image/[...chemin].
 */
export function resoudreCheminImageBD(segments: string[]): string | null {
  if (segments.length === 1) {
    const fichier = segments[0];
    if (!/^[a-zA-Z0-9_.-]+\.(png|jpg|webp)$/.test(fichier) || fichier.includes("..")) {
      return null;
    }
    return path.join(DOSSIER_BD, fichier);
  }
  if (segments.length === 2 && segments[0] === "personnages") {
    const fichier = segments[1];
    if (!/^[a-z0-9-]+\.(png|jpg|webp)$/.test(fichier)) return null;
    return path.join(DOSSIER_BD_PERSONNAGES, fichier);
  }
  return null;
}
