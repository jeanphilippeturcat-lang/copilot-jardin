import { Type, type Content, type Part } from "@google/genai";
import type { BandeDessinee } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMeteo } from "@/lib/meteo";
import {
  createGeminiImageBatchJob,
  generateGeminiContent,
  generateGeminiImage,
  getGeminiImageBatchResult,
} from "@/lib/gemini";
import {
  OPERATIONS_BD,
  PERSONNAGES_BD,
  getPersonnagePourOperation,
  normaliserOperationBD,
} from "@/lib/bd-personnages";
import {
  choisirDirectionArtistique,
  choisirMaquetteAleatoire,
  construirePromptChronique,
  extraireMaquetteDepuisPrompt,
  type MaquetteGazetteId,
} from "@/lib/bd-prompt";
import { getSemaineISO, type SemaineDates } from "@/lib/semaine";
import {
  getInfosImageReferenceLayout,
  getUrlPortraitPersonnageSiExistant,
  lireImageReferenceLayout,
  sauvegarderImageBD,
  supprimerImageBD,
} from "@/lib/stockage";
import type {
  BandeDessineeDTO,
  CaseBD,
  OperationBD,
  PersonnageBDAvecPortrait,
  ReferenceLayoutInfo,
} from "@/types";

interface TacheChroniqueIA {
  operation: OperationBD;
  actionCle: string;
  planteOuZone?: string;
  iconVisualEn: string;
  bulle: string;
  scene: string;
}

interface ChroniqueSemaineIA {
  mainHeadline: string;
  leadParagraph: string;
  gardenReportText: string;
  weatherCondition: string;
  weatherVisual: string;
  tempMax: string;
  tempMin: string;
  featuredPlantVisual: string;
  featuredPlantSpeech: string;
  pestPanelVisual: string;
  pestBubble1: string;
  pestBubble2: string;
  mainComicVisual: string;
  mainBubble1: string;
  mainBubble2: string;
  starOperation: OperationBD;
  characterQuote: string;
  tasks: TacheChroniqueIA[];
}

export type ModeGenerationBD = "prompt" | "batch" | "image" | "complet";

export interface ResultatGenerationBD {
  bd: BandeDessineeDTO;
  genere: boolean;
  imageErreur: string | null;
  casting: PersonnageBDAvecPortrait[];
  referenceLayout: ReferenceLayoutInfo | null;
}

const ETATS_BATCH_EN_COURS = new Set([
  "JOB_STATE_UNSPECIFIED",
  "JOB_STATE_QUEUED",
  "JOB_STATE_PENDING",
  "JOB_STATE_RUNNING",
]);

// Déduplication en mémoire pour éviter les générations concurrentes
const generationsEnCours = new Map<string, Promise<ResultatGenerationBD>>();

export function parseCasesBD(raw: string): CaseBD[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as CaseBD[];
  } catch {
    return [];
  }
}

export function serialiserBandeDessinee(bd: BandeDessinee): BandeDessineeDTO {
  return {
    id: bd.id,
    semaineCle: bd.semaineCle,
    dateDebut: bd.dateDebut.toISOString(),
    dateFin: bd.dateFin.toISOString(),
    titre: bd.titre,
    resume: bd.resume,
    imageUrl: bd.imageUrl,
    promptImage: bd.promptImage,
    cases: parseCasesBD(bd.actionsJson),
    modeleTexte: bd.modeleTexte,
    modeleImage: bd.modeleImage,
    batchJobName: bd.batchJobName,
    batchStatut: bd.batchStatut,
    createdAt: bd.createdAt.toISOString(),
    updatedAt: bd.updatedAt.toISOString(),
  };
}

export async function getCastingAvecPortraits(): Promise<PersonnageBDAvecPortrait[]> {
  return Promise.all(
    PERSONNAGES_BD.map(async (personnage) => ({
      ...personnage,
      portraitUrl: await getUrlPortraitPersonnageSiExistant(personnage.id),
    }))
  );
}

/**
 * Charge l'image de référence de style uniquement si l'utilisateur en a explicitement défini une.
 * Aucun fallback automatique sur l'édition précédente afin de préserver la variété de mise en page.
 */
async function chargerReferenceStyleOptionnelle(): Promise<{
  buffer: Buffer;
  mimeType: "image/jpeg";
} | null> {
  const existante = await lireImageReferenceLayout();
  if (!existante) {
    return null;
  }
  return { buffer: existante.buffer, mimeType: existante.mimeType };
}

/**
 * Construit le payload d'une SEULE requête stateless (aucun historique multi-tour)
 * avec éventuellement une référence de style/personnages (jamais la mise en page)
 * + le prompt pur "The Garden Chronicle".
 */
async function construireContenuImageStateless(promptImage: string): Promise<Content[]> {
  const promptPur = promptImage.split("\n---\nDONNÉES DU JARDIN")[0].trim();
  const reference = await chargerReferenceStyleOptionnelle();
  const parts: Part[] = [];

  if (reference) {
    parts.push({
      text: "STYLE & CHARACTER REFERENCE ONLY (single compressed JPEG): Match ONLY the crisp black-and-white Franco-Belgian ligne claire ink style, line weight, high-contrast e-ink monochrome look, and recurring Mediterranean animal character designs. DO NOT copy the page grid, column proportions, header bar style, or box placement from this reference image — strictly follow the NEW layout blueprint and every text/panel instruction below.",
    });
    parts.push({
      inlineData: {
        mimeType: reference.mimeType,
        data: reference.buffer.toString("base64"),
      },
    });
  }

  parts.push({ text: promptPur });

  return [{ role: "user", parts }];
}

/**
 * Étape 1 : Sélectionne les 3 actions clés de la semaine (tâches calendrier + jardin + météo),
 * tire une maquette et une direction artistique variées, et rédige la une "THE GARDEN CHRONICLE".
 */
async function genererChroniqueSemaine(
  semaine: SemaineDates,
  maquettesAEviter: readonly (MaquetteGazetteId | null | undefined)[] = []
): Promise<{
  chronique: ChroniqueSemaineIA;
  promptImage: string;
  casesEnrichies: CaseBD[];
  modeleTexte: string;
}> {
  const dans14Jours = new Date(semaine.dateFin.getTime() + 14 * 86_400_000);
  const ilYa21Jours = new Date(Date.now() - 21 * 86_400_000);

  const [zones, tachesSemaine, tachesEnRetard, intentions, interventions, meteo] =
    await Promise.all([
      prisma.zone.findMany({ include: { plantes: true } }),
      prisma.tache.findMany({
        where: {
          statut: "a_faire",
          dateEcheance: { gte: semaine.dateDebut, lte: semaine.dateFin },
        },
        include: { plante: { select: { nom: true } } },
        orderBy: { dateEcheance: "asc" },
      }),
      prisma.tache.findMany({
        where: {
          statut: "a_faire",
          OR: [{ dateEcheance: null }, { dateEcheance: { lt: semaine.dateDebut } }],
        },
        include: { plante: { select: { nom: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.intentionPlantation.findMany({
        where: { statut: "planifiee" },
        include: {
          zone: { select: { nom: true } },
          taches: {
            where: {
              statut: "a_faire",
              dateEcheance: { lte: dans14Jours },
            },
            orderBy: { dateEcheance: "asc" },
          },
        },
      }),
      prisma.intervention.findMany({
        where: { date: { gte: ilYa21Jours } },
        orderBy: { date: "desc" },
        take: 15,
      }),
      getMeteo().catch(() => []),
    ]);

  const mois = semaine.dateDebut.toLocaleString("fr-FR", { month: "long" });
  const aujourdhuiStr = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const descriptionJardin = zones.length
    ? zones
        .map((z) => {
          const plantes = z.plantes.map((p) => p.nom).join(", ");
          return `- Zone "${z.nom}" (${z.type}${z.exposition ? `, ${z.exposition}` : ""}) : ${plantes || "aucune plante"}`;
        })
        .join("\n")
    : "Jardin méditerranéen en cours d'aménagement (aucune zone définie).";

  const descriptionTachesSemaine = tachesSemaine.length
    ? tachesSemaine
        .map((t) => {
          const jour = t.dateEcheance
            ? t.dateEcheance.toLocaleDateString("fr-FR", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })
            : "";
          const plante = t.plante ? ` [${t.plante.nom}]` : "";
          const op = normaliserOperationBD(t.type);
          return `- ${jour} : ${t.titre}${plante} (type: ${t.type} → opération: ${op})${t.description ? ` — ${t.description}` : ""}`;
        })
        .join("\n")
    : "Aucune tâche spécifiquement datée cette semaine dans le calendrier.";

  const descriptionTachesEnAttente = tachesEnRetard.length
    ? tachesEnRetard
        .map((t) => {
          const plante = t.plante ? ` [${t.plante.nom}]` : "";
          const op = normaliserOperationBD(t.type);
          return `- ${t.titre}${plante} (opération: ${op})`;
        })
        .join("\n")
    : "Aucune tâche en attente.";

  const descriptionIntentions = intentions.length
    ? intentions
        .map(
          (i) =>
            `- Projet "${i.nomPlante}" dans ${i.zone.nom} (période optimale : ${i.periodeOptimale ?? "non précisée"})${
              i.taches.length
                ? ` — étapes proches : ${i.taches.map((t) => t.titre).join(", ")}`
                : ""
            }`
        )
        .join("\n")
    : "Aucune intention de plantation en cours.";

  const descriptionMeteo = meteo.length
    ? meteo
        .map(
          (m) =>
            `- ${m.date} : ${m.tempMin}°–${m.tempMax}°C, ${m.description}, pluie ${m.pluie}mm`
        )
        .join("\n")
    : "Météo non disponible (estimer une météo typique de saison en Sud de la France).";

  const descriptionInterventions = interventions.length
    ? interventions
        .map((i) => `- ${i.date.toLocaleDateString("fr-FR")} : ${i.type} — ${i.description}`)
        .join("\n")
    : "Aucune intervention récente.";

  const maquette = choisirMaquetteAleatoire(maquettesAEviter);
  const directionArtistique = choisirDirectionArtistique(semaine.dateDebut);

  const guideCasting = PERSONNAGES_BD.map(
    (p) =>
      `- operation "${p.operation}" → ${p.nom} (${p.roleLabel}) | Visuel EN : ${p.descriptionVisuelleEn} with ${p.accessoireSignatureEn}`
  ).join("\n");

  const prompt = `Tu es rédacteur en chef joyeux de la gazette BD "THE GARDEN CHRONICLE" ET expert en jardinage pour le Sud de la France (climat méditerranéen).
Nous préparons l'édition hebdomadaire pour la ${semaine.libelle} (mois de ${mois} ${semaine.annee}, saison : ${directionArtistique.saisonLabelFr}, aujourd'hui : ${aujourdhuiStr}).

MAQUETTE & DIRECTION ARTISTIQUE TIRÉES AU SORT POUR CETTE ÉDITION (à respecter pour varier le rendu d'une semaine à l'autre, pensé pour un écran e-ink noir & blanc haut contraste) :
- Maquette : ${maquette.nom} — ${maquette.descriptionFr}
- Cadrage principal (camera angle) : ${directionArtistique.angleCameraEn}
- Décor du jardin : ${directionArtistique.decorJardinEn}
- Présentation de la plante vedette : ${directionArtistique.presentationPlanteEn}

JARDIN :
${descriptionJardin}

TÂCHES DU CALENDRIER CETTE SEMAINE (prioritaires) :
${descriptionTachesSemaine}

TÂCHES EN ATTENTE / À RATTRAPER :
${descriptionTachesEnAttente}

PROJETS DE PLANTATION :
${descriptionIntentions}

MÉTÉO DES PROCHAINS JOURS :
${descriptionMeteo}

INTERVENTIONS RÉCENTES (21 JOURS) :
${descriptionInterventions}

CASTING MÉDITERRANÉEN STRICT (chaque opération est TOUJOURS effectuée par son personnage animal attitré) :
${guideCasting}

CONSIGNES :
1. Choisis UNIQUEMENT les 3 ACTIONS CLÉS les plus importantes de cette semaine (privilégie les tâches du calendrier de cette semaine ; complète avec les actions saisonnières/météo vraiment essentielles pour ce jardin méditerranéen). Reste joyeux, léger et concentré sur l'essentiel.
2. Remplis tous les champs de la une de journal BD vintage en FRANÇAIS pour tous les textes imprimés/bulles, et en ANGLAIS précis pour les descriptions visuelles (dessin trait noir pur sur fond blanc pur, ligne claire sans nuances de gris, lisible sur écran e-ink) :
   - "mainHeadline" (FR, court, percutant, joyeux, max 7 mots)
   - "leadParagraph" (FR, 1 à 2 courtes phrases chaleureuses résumant la semaine au jardin)
   - "gardenReportText" (FR, 2 courtes phrases maximum sur l'état du jardin cette semaine)
   - "weatherCondition" (FR court, ex: "Ensoleillé", "Pluvieux", "Mistral frais", "Doux et voilé"), "tempMax" (ex: "18°C"), "tempMin" (ex: "8°C") — basés sur la météo réelle ci-dessus
   - "weatherVisual" (EN, petite illustration BD au trait noir fidèle à la météo réelle de la semaine : ex. cheerful smiling vintage sun with crisp triangular rays si ensoleillé, playful raincloud with raindrops and tiny umbrella si pluvieux, swirling Mistral wind lines blowing olive leaves si venteux, crisp snowflake/frost crystals with a scarfed bird si froid, fluffy sun peeking behind clean ink clouds si voilé)
   - "featuredPlantVisual" (EN, illustration BD d'une plante réelle du jardin ou de saison en suivant ce style de présentation : "${directionArtistique.presentationPlanteEn}")
   - "featuredPlantSpeech" (FR, bulle joyeuse très courte, max 6 mots)
   - "pestPanelVisual" (EN, petite scène BD de vigilance saisonnière mettant en scène Margot la mante religieuse — varie l'action selon la saison et la météo : inspection d'un bourgeon, observation du vent/gel/humidité du sol, vérification d'une tige ou d'un voile d'hivernage, ou accueil de coccinelles)
   - "pestBubble1" et "pestBubble2" (FR, 2 très courtes bulles joyeuses, max 5 mots chacune)
   - "starOperation" : l'opération principale de la semaine (${OPERATIONS_BD.join(", ")}) — elle désigne le personnage vedette de la semaine !
   - "mainComicVisual" (EN, grande scène BD joyeuse utilisant le cadrage "${directionArtistique.angleCameraEn}", située "${directionArtistique.decorJardinEn}", mettant en scène le personnage animal correspondant à starOperation dans son exacte description visuelle EN ci-dessus en train de réaliser l'action clé principale ; tu peux éventuellement inclure un second animal de l'équipe en arrière-plan pour dynamiser la scène)
   - "mainBubble1" et "mainBubble2" (FR, 2 courtes bulles joyeuses, max 7 mots chacune)
   - "characterQuote" (FR, citation joyeuse et motivante du personnage vedette, max 10 mots)
   - "tasks" : exactement 3 objets correspondant aux 3 actions clés :
     - "operation" : valeur exacte parmi (${OPERATIONS_BD.join(", ")})
     - "actionCle" : intitulé court et concret en français (max 7 mots) pour la checklist "CHRONIQUE DES TÂCHES"
     - "planteOuZone" : nom de la plante ou zone concernée si pertinent
     - "iconVisualEn" : courte description EN d'une petite icône trait noir (ex: "a garden trowel and seedling", "a watering can", "pruning shears")
     - "bulle" : petite phrase joyeuse du personnage associé (FR, max 8 mots)
     - "scene" : courte description EN de la scène avec le personnage attitré

Réponds UNIQUEMENT en JSON valide conforme au schéma.`;

  const { response, model } = await generateGeminiContent({
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mainHeadline: { type: Type.STRING },
          leadParagraph: { type: Type.STRING },
          gardenReportText: { type: Type.STRING },
          weatherCondition: { type: Type.STRING },
          weatherVisual: { type: Type.STRING },
          tempMax: { type: Type.STRING },
          tempMin: { type: Type.STRING },
          featuredPlantVisual: { type: Type.STRING },
          featuredPlantSpeech: { type: Type.STRING },
          pestPanelVisual: { type: Type.STRING },
          pestBubble1: { type: Type.STRING },
          pestBubble2: { type: Type.STRING },
          mainComicVisual: { type: Type.STRING },
          mainBubble1: { type: Type.STRING },
          mainBubble2: { type: Type.STRING },
          starOperation: { type: Type.STRING, enum: [...OPERATIONS_BD] },
          characterQuote: { type: Type.STRING },
          tasks: {
            type: Type.ARRAY,
            minItems: 3,
            maxItems: 3,
            items: {
              type: Type.OBJECT,
              properties: {
                operation: { type: Type.STRING, enum: [...OPERATIONS_BD] },
                actionCle: { type: Type.STRING },
                planteOuZone: { type: Type.STRING },
                iconVisualEn: { type: Type.STRING },
                bulle: { type: Type.STRING },
                scene: { type: Type.STRING },
              },
              required: ["operation", "actionCle", "iconVisualEn", "bulle", "scene"],
            },
          },
        },
        required: [
          "mainHeadline",
          "leadParagraph",
          "gardenReportText",
          "weatherCondition",
          "weatherVisual",
          "tempMax",
          "tempMin",
          "featuredPlantVisual",
          "featuredPlantSpeech",
          "pestPanelVisual",
          "pestBubble1",
          "pestBubble2",
          "mainComicVisual",
          "mainBubble1",
          "mainBubble2",
          "starOperation",
          "characterQuote",
          "tasks",
        ],
      },
    },
  });

  const texte = response.text ?? "";
  let chronique: ChroniqueSemaineIA;
  try {
    chronique = JSON.parse(texte) as ChroniqueSemaineIA;
  } catch {
    throw new Error("Le scénario de la chronique BD retourné par l'IA est invalide");
  }

  if (!chronique.mainHeadline || !Array.isArray(chronique.tasks) || chronique.tasks.length < 3) {
    throw new Error("Le scénario de la chronique BD est incomplet");
  }

  const starOp = OPERATIONS_BD.includes(chronique.starOperation)
    ? chronique.starOperation
    : normaliserOperationBD(chronique.starOperation);
  const personnageVedette = getPersonnagePourOperation(starOp);

  const tasksNormalisees = chronique.tasks.slice(0, 3).map((t) => ({
    ...t,
    operation: OPERATIONS_BD.includes(t.operation)
      ? t.operation
      : normaliserOperationBD(t.operation),
  }));

  const casesEnrichies: CaseBD[] = tasksNormalisees.map((t, idx) => {
    const p = getPersonnagePourOperation(t.operation);
    return {
      numero: idx + 1,
      operation: t.operation,
      personnageId: p.id,
      personnageNom: p.nom,
      actionCle: t.actionCle,
      planteOuZone: t.planteOuZone || undefined,
      bulle: t.bulle,
      scene: t.scene,
    };
  });

  const dateBanner = `ÉDITION DU ${aujourdhuiStr.toUpperCase()} · SEMAINE ${semaine.numeroSemaine}`;

  const actionsClesResume = casesEnrichies
    .map(
      (c) =>
        `${c.numero}. ${c.actionCle}${c.planteOuZone ? ` [${c.planteOuZone}]` : ""} — ${c.personnageNom} (${c.operation}) — « ${c.bulle} »`
    )
    .join("\n");

  const guidePersonnagesCourt = PERSONNAGES_BD.map(
    (p) => `- ${p.roleLabel} (${p.operation}) : ${p.nom} — ${p.descriptionFr}`
  ).join("\n");

  const promptImage = construirePromptChronique({
    maquette,
    directionArtistique,
    dateBanner,
    gardenReportText: chronique.gardenReportText,
    weatherCondition: chronique.weatherCondition,
    weatherVisual: chronique.weatherVisual,
    tempMax: chronique.tempMax,
    tempMin: chronique.tempMin,
    featuredPlantVisual: chronique.featuredPlantVisual,
    featuredPlantSpeech: chronique.featuredPlantSpeech,
    mainHeadline: chronique.mainHeadline,
    leadParagraph: chronique.leadParagraph,
    pestPanelVisual: chronique.pestPanelVisual,
    pestBubble1: chronique.pestBubble1,
    pestBubble2: chronique.pestBubble2,
    mainComicVisual: chronique.mainComicVisual,
    mainBubble1: chronique.mainBubble1,
    mainBubble2: chronique.mainBubble2,
    characterName: personnageVedette.nom,
    characterQuote: chronique.characterQuote,
    task1: tasksNormalisees[0].actionCle,
    task1Icon: tasksNormalisees[0].iconVisualEn,
    task2: tasksNormalisees[1].actionCle,
    task2Icon: tasksNormalisees[1].iconVisualEn,
    task3: tasksNormalisees[2].actionCle,
    task3Icon: tasksNormalisees[2].iconVisualEn,
    mascotVisual: `${personnageVedette.descriptionVisuelleEn}, holding ${personnageVedette.accessoireSignatureEn}`,
    contexte: {
      semaineLibelle: semaine.libelle,
      moisAnnee: `${mois} ${semaine.annee}`,
      descriptionJardin,
      descriptionMeteo,
      descriptionTachesSemaine,
      descriptionTachesEnAttente,
      descriptionIntentions,
      descriptionInterventions,
      actionsClesResume,
      guidePersonnages: guidePersonnagesCourt,
    },
  });

  return {
    chronique,
    promptImage,
    casesEnrichies,
    modeleTexte: model,
  };
}

/**
 * Vérifie les jobs Batch Gemini en attente et enregistre l'image dès qu'un job est terminé.
 */
export async function verifierBatchsEnAttente(): Promise<{
  misesAJour: number;
  erreurs: string[];
}> {
  const enAttente = await prisma.bandeDessinee.findMany({
    where: {
      batchJobName: { not: null },
      batchStatut: { in: Array.from(ETATS_BATCH_EN_COURS) },
    },
  });

  let misesAJour = 0;
  const erreurs: string[] = [];

  for (const bd of enAttente) {
    if (!bd.batchJobName) continue;
    try {
      const res = await getGeminiImageBatchResult(bd.batchJobName);

      if (res.status === "succeeded") {
        const nouvelleUrl = await sauvegarderImageBD(
          bd.semaineCle,
          res.buffer,
          res.mimeType
        );
        const ancienneUrl = bd.imageUrl;

        await prisma.bandeDessinee.update({
          where: { id: bd.id },
          data: {
            imageUrl: nouvelleUrl,
            batchStatut: res.state,
          },
        });

        if (ancienneUrl && ancienneUrl !== nouvelleUrl) {
          await supprimerImageBD(ancienneUrl);
        }
        misesAJour += 1;
      } else if (res.status === "failed") {
        await prisma.bandeDessinee.update({
          where: { id: bd.id },
          data: { batchStatut: res.state },
        });
        erreurs.push(`${bd.semaineCle} : ${res.error}`);
        misesAJour += 1;
      } else if (res.state !== bd.batchStatut) {
        await prisma.bandeDessinee.update({
          where: { id: bd.id },
          data: { batchStatut: res.state },
        });
      }
    } catch (err) {
      erreurs.push(
        err instanceof Error ? err.message : `Erreur vérification batch ${bd.semaineCle}`
      );
    }
  }

  return { misesAJour, erreurs };
}

/**
 * Génère (ou récupère si déjà existante et force=false) l'édition BD de la semaine courante.
 * - mode="prompt" (défaut) : uniquement la chronique + prompt prêt à copier (génération d'image auto désactivée)
 * - mode="batch" : met en file d'attente via client.batches.create() (-50%, Nano Banana 2 Lite, 1K 16:9, 1 JPEG compressé stateless)
 * - mode="image" / "complet" : génération directe stateless (Nano Banana 2 Lite, 1K 16:9, 1 JPEG compressé stateless)
 */
export async function genererOuRecupererBDSemaine(options?: {
  force?: boolean;
  mode?: ModeGenerationBD;
  dateReference?: Date;
}): Promise<ResultatGenerationBD> {
  const force = Boolean(options?.force);
  const mode: ModeGenerationBD = options?.mode ?? "prompt";
  const semaine = getSemaineISO(options?.dateReference ?? new Date());

  const existante = await prisma.bandeDessinee.findUnique({
    where: { semaineCle: semaine.semaineCle },
  });

  if (existante && !force && mode === "prompt") {
    return {
      bd: serialiserBandeDessinee(existante),
      genere: false,
      imageErreur: null,
      casting: await getCastingAvecPortraits(),
      referenceLayout: await getInfosImageReferenceLayout(),
    };
  }

  const cleVerrou = `${semaine.semaineCle}:${mode}:${force ? "force" : "auto"}`;
  const dejaEnCours = generationsEnCours.get(cleVerrou);
  if (dejaEnCours) {
    return dejaEnCours;
  }

  const tacheGeneration = (async (): Promise<ResultatGenerationBD> => {
    let titre = existante?.titre ?? "";
    let resume = existante?.resume ?? null;
    let promptImage = existante?.promptImage ?? null;
    let casesEnrichies: CaseBD[] = existante ? parseCasesBD(existante.actionsJson) : [];
    let modeleTexte = existante?.modeleTexte ?? null;

    if (
      !existante ||
      !promptImage ||
      mode === "prompt" ||
      ((mode === "complet" || mode === "batch") && force)
    ) {
      // Évite de répéter la maquette précédente ou celle en cours lors d'une régénération
      const editionPrecedente = await prisma.bandeDessinee.findFirst({
        where: { semaineCle: { not: semaine.semaineCle } },
        orderBy: { dateDebut: "desc" },
        select: { promptImage: true },
      });
      const maquettesAEviter = [
        extraireMaquetteDepuisPrompt(existante?.promptImage),
        extraireMaquetteDepuisPrompt(editionPrecedente?.promptImage),
      ];
      const resultatScenario = await genererChroniqueSemaine(semaine, maquettesAEviter);
      titre = resultatScenario.chronique.mainHeadline;
      resume = resultatScenario.chronique.leadParagraph;
      promptImage = resultatScenario.promptImage;
      casesEnrichies = resultatScenario.casesEnrichies;
      modeleTexte = resultatScenario.modeleTexte;
    }

    let imageUrl: string | null = existante?.imageUrl ?? null;
    let modeleImage: string | null = existante?.modeleImage ?? null;
    let batchJobName: string | null = existante?.batchJobName ?? null;
    let batchStatut: string | null = existante?.batchStatut ?? null;
    let imageErreur: string | null = null;
    let ancienneImageASupprimer: string | null = null;

    if (mode === "batch" && promptImage) {
      try {
        const contents = await construireContenuImageStateless(promptImage);
        const batch = await createGeminiImageBatchJob({
          contents,
          displayName: `garden-chronicle-${semaine.semaineCle}`,
          aspectRatio: "16:9",
          imageSize: "1K",
        });
        batchJobName = batch.jobName;
        batchStatut = batch.state;
        modeleImage = `${batch.model} (batch)`;
      } catch (err) {
        imageErreur =
          err instanceof Error
            ? err.message
            : "Impossible de mettre en file d'attente le job Batch Gemini";
      }
    } else if ((mode === "image" || mode === "complet") && promptImage) {
      try {
        const contents = await construireContenuImageStateless(promptImage);
        const { buffer, mimeType, model } = await generateGeminiImage({
          contents,
          aspectRatio: "16:9",
          imageSize: "1K",
        });
        const nouvelleUrl = await sauvegarderImageBD(
          semaine.semaineCle,
          buffer,
          mimeType
        );
        if (existante?.imageUrl && existante.imageUrl !== nouvelleUrl) {
          ancienneImageASupprimer = existante.imageUrl;
        }
        imageUrl = nouvelleUrl;
        modeleImage = model;
        batchJobName = null;
        batchStatut = null;
      } catch (err) {
        imageErreur =
          err instanceof Error
            ? err.message
            : "Impossible de générer l'image avec Gemini";
      }
    }

    const record = await prisma.bandeDessinee.upsert({
      where: { semaineCle: semaine.semaineCle },
      create: {
        semaineCle: semaine.semaineCle,
        dateDebut: semaine.dateDebut,
        dateFin: semaine.dateFin,
        titre,
        resume,
        imageUrl,
        promptImage,
        actionsJson: JSON.stringify(casesEnrichies),
        modeleTexte,
        modeleImage,
        batchJobName,
        batchStatut,
      },
      update: {
        dateDebut: semaine.dateDebut,
        dateFin: semaine.dateFin,
        titre,
        resume,
        imageUrl,
        promptImage,
        actionsJson: JSON.stringify(casesEnrichies),
        modeleTexte,
        modeleImage,
        batchJobName,
        batchStatut,
      },
    });

    if (ancienneImageASupprimer) {
      await supprimerImageBD(ancienneImageASupprimer);
    }

    return {
      bd: serialiserBandeDessinee(record),
      genere: true,
      imageErreur,
      casting: await getCastingAvecPortraits(),
      referenceLayout: await getInfosImageReferenceLayout(),
    };
  })();

  generationsEnCours.set(cleVerrou, tacheGeneration);
  try {
    return await tacheGeneration;
  } finally {
    generationsEnCours.delete(cleVerrou);
  }
}
