import { NextResponse } from "next/server";
import { Type } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { generateGeminiContent } from "@/lib/gemini";

interface TacheIA {
  titre: string;
  type: string;
  dateEcheance: string; // ISO date YYYY-MM-DD
  description?: string;
}

interface ReponseIA {
  periode_optimale: string;
  date_plantation: string; // ISO date YYYY-MM-DD
  raisonnement: string;
  taches: TacheIA[];
}

export async function GET() {
  const intentions = await prisma.intentionPlantation.findMany({
    where: { statut: { not: "annulee" } },
    include: {
      zone: { select: { nom: true, type: true } },
      taches: { orderBy: { dateEcheance: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialisees = intentions.map((i) => ({
    ...i,
    datePlantation: i.datePlantation?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
    taches: i.taches.map((t) => ({
      ...t,
      dateEcheance: t.dateEcheance?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  }));

  return NextResponse.json(serialisees);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { nomPlante, zoneId, notes } = body as {
    nomPlante: string;
    zoneId: string;
    notes?: string;
  };

  if (!nomPlante?.trim() || !zoneId) {
    return NextResponse.json(
      { error: "nomPlante et zoneId sont requis" },
      { status: 400 }
    );
  }

  const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
  if (!zone) {
    return NextResponse.json({ error: "Zone introuvable" }, { status: 404 });
  }

  const maintenant = new Date();
  const dateActuelle = maintenant.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const descriptionZone = [
    `type : ${zone.type}`,
    zone.exposition ? `exposition : ${zone.exposition}` : null,
    zone.surface ? `surface : ${zone.surface}m²` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const prompt = `Tu es un expert en jardinage pour le Sud de la France (climat méditerranéen).
Nous sommes le ${dateActuelle}.

L'utilisateur souhaite planter : ${nomPlante}
Zone de destination : "${zone.nom}" (${descriptionZone})
${notes ? `Notes de l'utilisateur : ${notes}` : ""}

Ta mission :
1. Déterminer la période optimale de plantation pour cette espèce dans ce climat
2. Proposer un calendrier de préparation complet avec des tâches datées précisément
   - Commence les préparations suffisamment en avance (sol, amendements, commande du plant…)
   - Inclus la tâche de plantation elle-même
   - Ajoute 1 ou 2 tâches de suivi après la plantation (arrosage d'installation, surveillance reprise)
3. Expliquer brièvement ton raisonnement

Contraintes :
- Si la période optimale est dans le passé pour cette année, planifie à l'année prochaine
- Toutes les dates doivent être au format YYYY-MM-DD et postérieures à aujourd'hui
- Génère entre 4 et 8 tâches au total

Réponds UNIQUEMENT avec du JSON valide, sans balise markdown :
{
  "periode_optimale": "ex: novembre 2026",
  "date_plantation": "YYYY-MM-DD",
  "raisonnement": "explication courte (2-3 phrases)",
  "taches": [
    {
      "titre": "...",
      "type": "préparation sol|plantation|arrosage|traitement|autre",
      "dateEcheance": "YYYY-MM-DD",
      "description": "conseil pratique ou astuce"
    }
  ]
}`;

  let result;
  try {
    const generated = await generateGeminiContent({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            periode_optimale: { type: Type.STRING },
            date_plantation: { type: Type.STRING },
            raisonnement: { type: Type.STRING },
            taches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  titre: { type: Type.STRING },
                  type: {
                    type: Type.STRING,
                    enum: [
                      "préparation sol",
                      "plantation",
                      "arrosage",
                      "traitement",
                      "autre",
                    ],
                  },
                  dateEcheance: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ["titre", "type", "dateEcheance"],
              },
            },
          },
          required: [
            "periode_optimale",
            "date_plantation",
            "raisonnement",
            "taches",
          ],
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

  let reponse: ReponseIA;
  try {
    reponse = JSON.parse(texte) as ReponseIA;
  } catch {
    return NextResponse.json(
      { error: "Réponse IA invalide", raw: texte },
      { status: 502 }
    );
  }

  if (!Array.isArray(reponse.taches)) {
    return NextResponse.json(
      { error: "Réponse IA incomplète", raw: texte },
      { status: 502 }
    );
  }

  // Sauvegarde l'intention et les tâches dans une transaction
  const intention = await prisma.$transaction(async (tx) => {
    const nouvelleIntention = await tx.intentionPlantation.create({
      data: {
        nomPlante: nomPlante.trim(),
        zoneId,
        notes: notes?.trim() ?? null,
        periodeOptimale: reponse.periode_optimale,
        datePlantation: new Date(reponse.date_plantation),
        raisonnement: reponse.raisonnement,
        statut: "planifiee",
      },
    });

    await tx.tache.createMany({
      data: reponse.taches.map((t) => ({
        titre: t.titre,
        type: t.type,
        description: t.description ?? null,
        dateEcheance: new Date(t.dateEcheance),
        source: "ia",
        statut: "a_faire",
        intentionId: nouvelleIntention.id,
      })),
    });

    return tx.intentionPlantation.findUnique({
      where: { id: nouvelleIntention.id },
      include: {
        zone: { select: { nom: true } },
        taches: { orderBy: { dateEcheance: "asc" } },
      },
    });
  });

  return NextResponse.json(
    {
      ...intention,
      datePlantation: intention?.datePlantation?.toISOString() ?? null,
      createdAt: intention?.createdAt.toISOString(),
      updatedAt: intention?.updatedAt.toISOString(),
      taches: intention?.taches.map((t) => ({
        ...t,
        dateEcheance: t.dateEcheance?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    },
    { status: 201 }
  );
}
