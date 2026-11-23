import { NextResponse } from "next/server";
import { Type } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { generateGeminiContent } from "@/lib/gemini";
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

  let result;
  try {
    const generated = await generateGeminiContent({
      contents: [
        {
          inlineData: {
            mimeType: mediaType,
            data: base64,
          },
        },
        {
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
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagnostic: { type: Type.STRING },
            causes_probables: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            traitements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            urgence: {
              type: Type.STRING,
              enum: ["faible", "moyenne", "haute"],
            },
          },
          required: ["diagnostic", "causes_probables", "traitements", "urgence"],
        },
      },
    });
    result = generated.response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur lors de l'appel à Gemini" },
      { status: 502 }
    );
  }

  const texte = result.text ?? "";

  let reponse: ReponseDiagnostic;
  try {
    reponse = JSON.parse(texte) as ReponseDiagnostic;
  } catch {
    return NextResponse.json({ error: "Réponse IA invalide", raw: texte }, { status: 502 });
  }

  if (!Array.isArray(reponse.causes_probables) || !Array.isArray(reponse.traitements)) {
    return NextResponse.json({ error: "Réponse IA incomplète", raw: texte }, { status: 502 });
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
