import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic, MODEL, MAX_TOKENS_RECOMMANDATIONS } from "@/lib/anthropic";
import { getMeteo } from "@/lib/meteo";

interface TacheIA {
  titre: string;
  type: string;
  urgence: "haute" | "moyenne" | "faible";
  planteId?: string;
}

interface AlerteIA {
  message: string;
  niveau: "info" | "warning" | "danger";
}

interface ReponseIA {
  taches: TacheIA[];
  alertes: AlerteIA[];
  conseil_du_jour: string;
}

export async function POST() {
  // Récupère les données du jardin
  const dans90Jours = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const [zones, interventionsRecentes, tachesEnCours, tachesFutures, meteo] = await Promise.all([
    prisma.zone.findMany({ include: { plantes: true } }),
    prisma.intervention.findMany({
      where: { date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      orderBy: { date: "desc" },
      take: 20,
    }),
    // Tâches sans date ou avec échéance aujourd'hui
    prisma.tache.findMany({
      where: { statut: "a_faire", OR: [{ dateEcheance: null }, { dateEcheance: { lte: new Date() } }] },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    // Plantations et préparations planifiées dans les 90 prochains jours
    prisma.tache.findMany({
      where: {
        statut: "a_faire",
        dateEcheance: { gt: new Date(), lte: dans90Jours },
        type: { in: ["plantation", "semis", "préparation sol"] },
      },
      include: { plante: { select: { nom: true } } },
      orderBy: { dateEcheance: "asc" },
    }),
    getMeteo().catch(() => []),
  ]);

  const maintenant = new Date();
  const mois = maintenant.toLocaleString("fr-FR", { month: "long" });

  const descriptionJardin = zones
    .map((z) => {
      const plantes = z.plantes.map((p) => `${p.nom}${p.nomLatine ? ` (${p.nomLatine})` : ""}`).join(", ");
      return `Zone "${z.nom}" (${z.type}${z.exposition ? `, exposition ${z.exposition}` : ""}${z.surface ? `, ${z.surface}m²` : ""}) : ${plantes || "aucune plante"}`;
    })
    .join("\n");

  const descriptionMeteo = meteo.length
    ? meteo
        .map((j) => `- ${j.date} : ${j.tempMin}°–${j.tempMax}°C, ${j.description}, pluie ${j.pluie}mm, humidité ${j.humidite}%`)
        .join("\n")
    : "Météo non disponible";

  const descriptionInterventions = interventionsRecentes.length
    ? interventionsRecentes.map((i) => `- ${i.date.toLocaleDateString("fr-FR")} : ${i.type} — ${i.description}`).join("\n")
    : "Aucune intervention récente";

  const descriptionTachesEnCours = tachesEnCours.length
    ? tachesEnCours.map((t) => `- ${t.titre} (${t.type})`).join("\n")
    : "Aucune tâche en attente";

  const descriptionPlantationsFutures = tachesFutures.length
    ? tachesFutures
        .map((t) => {
          const date = t.dateEcheance!.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
          const plante = t.plante ? ` [${t.plante.nom}]` : "";
          return `- ${date} : ${t.titre}${plante} (${t.type})`;
        })
        .join("\n")
    : "Aucune plantation ou semis planifiés dans les 90 prochains jours.";

  // Construit la liste des planteIds valides pour l'IA
  const planteIds = zones.flatMap((z) => z.plantes.map((p) => ({ id: p.id, nom: p.nom })));

  const prompt = `Tu es un expert en jardinage pour le Sud de la France (climat méditerranéen).
Nous sommes en ${mois} ${maintenant.getFullYear()}.

JARDIN :
${descriptionJardin || "Jardin vide, aucune zone définie."}

MÉTÉO DES 3 PROCHAINS JOURS :
${descriptionMeteo}

INTERVENTIONS DES 30 DERNIERS JOURS :
${descriptionInterventions}

TÂCHES DÉJÀ EN COURS :
${descriptionTachesEnCours}

PLANTATIONS ET SEMIS PLANIFIÉS (90 PROCHAINS JOURS) :
${descriptionPlantationsFutures}

PLANTES DISPONIBLES (id → nom) :
${planteIds.map((p) => `${p.id} → ${p.nom}`).join("\n") || "Aucune"}

Génère des recommandations personnalisées pour aujourd'hui. Prends en compte la météo, la saison et l'historique.
Si des plantations ou semis sont prévus prochainement, anticipe les préparations nécessaires : amendement du sol, travail de la terre, arrosage préalable, protection, etc.
N'inclus pas de tâches déjà en cours.

Réponds UNIQUEMENT avec du JSON valide, sans balise markdown, au format exact :
{
  "taches": [{ "titre": "...", "type": "arrosage|taille|semis|plantation|préparation sol|traitement|récolte|autre", "urgence": "haute|moyenne|faible", "planteId": "..." }],
  "alertes": [{ "message": "...", "niveau": "info|warning|danger" }],
  "conseil_du_jour": "..."
}
Le champ planteId est optionnel (omets-le si la tâche concerne tout le jardin).
Génère entre 2 et 5 tâches et entre 0 et 3 alertes.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS_RECOMMANDATIONS,
    messages: [{ role: "user", content: prompt }],
  });

  const texte = message.content[0].type === "text" ? message.content[0].text : "";

  let reponse: ReponseIA;
  try {
    reponse = JSON.parse(texte) as ReponseIA;
  } catch {
    return NextResponse.json(
      { error: "Réponse IA invalide", raw: texte },
      { status: 502 }
    );
  }

  // Valide les planteIds retournés par l'IA
  const planteIdsValides = new Set(planteIds.map((p) => p.id));

  // Sauvegarde les tâches en base
  const tachesCrees = await Promise.all(
    reponse.taches.map((t) =>
      prisma.tache.create({
        data: {
          titre: t.titre,
          type: t.type,
          source: "ia",
          statut: "a_faire",
          planteId: t.planteId && planteIdsValides.has(t.planteId) ? t.planteId : null,
          dateEcheance: new Date(),
        },
      })
    )
  );

  return NextResponse.json({
    taches: tachesCrees,
    alertes: reponse.alertes,
    conseil_du_jour: reponse.conseil_du_jour,
  });
}
