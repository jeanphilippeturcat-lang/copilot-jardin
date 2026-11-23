import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic, MODEL } from "@/lib/anthropic";
import { readFile } from "fs/promises";
import path from "path";

interface ReponseDiagnostic {
  diagnostic: string;
  causes_probables: string[];
  traitements: string[];
  urgence: "faible" | "moyenne" | "haute";
}

export async function POST(request: Request) {
  const body = await request.json() as { observationId: string };
  const { observationId } = body;

  if (!observationId) {
    return NextResponse.json({ error: "observationId requis" }, { status: 400 });
  }

  const observation = await prisma.observation.findUnique({
    where: { id: observationId },
    include: { plante: { select: { nom: true, nomLatine: true, type: true } } },
  });

  if (!observation) return NextResponse.json({ error: "Observation introuvable" }, { status: 404 });
  if (!observation.photoUrl) return NextResponse.json({ error: "Pas de photo associée" }, { status: 400 });

  // Lecture de l'image depuis le disque local
  const cheminFichier = path.join(process.cwd(), "public", observation.photoUrl);
  const imageBuffer = await readFile(cheminFichier);
  const base64 = imageBuffer.toString("base64");
  const mediaType = observation.photoUrl.endsWith(".png") ? "image/png"
    : observation.photoUrl.endsWith(".webp") ? "image/webp"
    : "image/jpeg";

  const nomPlante = observation.plante.nomLatine
    ? `${observation.plante.nom} (${observation.plante.nomLatine})`
    : observation.plante.nom;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: `Tu es un expert en phytopathologie pour le jardinage en Sud de la France (climat méditerranéen).

Analyse cette photo de la plante : ${nomPlante} (type : ${observation.plante.type}).
${observation.note ? `Note de l'utilisateur : "${observation.note}"` : ""}

Réponds UNIQUEMENT avec du JSON valide, sans balise markdown :
{
  "diagnostic": "description de l'état général et du problème observé",
  "causes_probables": ["cause 1", "cause 2"],
  "traitements": ["traitement ou action 1", "traitement ou action 2"],
  "urgence": "faible|moyenne|haute"
}`,
          },
        ],
      },
    ],
  });

  const texte = message.content[0].type === "text" ? message.content[0].text : "";

  let reponse: ReponseDiagnostic;
  try {
    reponse = JSON.parse(texte) as ReponseDiagnostic;
  } catch {
    return NextResponse.json({ error: "Réponse IA invalide", raw: texte }, { status: 502 });
  }

  const diagnosticTexte = JSON.stringify(reponse);

  const observationMaj = await prisma.observation.update({
    where: { id: observationId },
    data: { diagnostic: diagnosticTexte },
    include: { plante: { select: { id: true, nom: true, zone: { select: { nom: true } } } } },
  });

  return NextResponse.json({
    ...observationMaj,
    createdAt: observationMaj.createdAt.toISOString(),
    diagnosticParse: reponse,
  });
}
