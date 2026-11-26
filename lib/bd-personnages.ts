import type { OperationBD, PersonnageBD } from "@/types";

/**
 * Casting récurrent des animaux méditerranéens du Sud de la France
 * (Provence, Camargue, garrigue).
 * Chaque opération du jardin est TOUJOURS effectuée par le même personnage
 * afin d'assurer une cohérence visuelle d'une semaine à l'autre.
 */
export const PERSONNAGES_BD: readonly PersonnageBD[] = [
  {
    id: "marcel-sanglier",
    operation: "plantation",
    nom: "Marcel le sanglier",
    animal: "Sanglier de la garrigue",
    roleLabel: "Plantation, semis & sol",
    operationsCouvertes: ["plantation", "semis", "préparation sol"],
    descriptionFr:
      "Joyeux sanglier de la garrigue en tablier rayé avec un brin de lavande en poche, toujours prêt à préparer la terre, semer et planter.",
    descriptionVisuelleEn:
      "Marcel, a cheerful plump Provençal wild boar from the garrigue standing upright on two legs, friendly expressive eyes, bushy arched eyebrows, small curved tusks, snout with a warm grin, wearing a crisp striped Provençal canvas gardener apron with a tiny sprig of lavender tucked into the front pocket",
    accessoireSignatureEn:
      "a wooden-handled garden trowel and a small paper seed packet tucked in his apron pocket",
  },
  {
    id: "mireille-flamant",
    operation: "arrosage",
    nom: "Mireille le flamant de Camargue",
    animal: "Flamant de Camargue",
    roleLabel: "Arrosage",
    operationsCouvertes: ["arrosage"],
    descriptionFr:
      "Élégant flamant de Camargue coiffé d'un chapeau de paille provençal, responsable de l'arrosage tout en douceur.",
    descriptionVisuelleEn:
      "Mireille, a cheerful expressive Camargue flamingo with a graceful curved neck, friendly big smiling eyes and distinctive curved flamingo beak, standing happily in a Provençal garden, wearing a wide-brimmed Provençal straw sun hat tied with a dark ribbon",
    accessoireSignatureEn:
      "a classic galvanized metal watering can with a long spout and rosette sprinkler",
  },
  {
    id: "leon-lezard",
    operation: "taille",
    nom: "Léon le lézard de Provence",
    animal: "Lézard ocellé",
    roleLabel: "Taille",
    operationsCouvertes: ["taille"],
    descriptionFr:
      "Lézard ocellé vif et souriant en foulard provençal, spécialiste de la taille nette des oliviers, vignes et arbustes.",
    descriptionVisuelleEn:
      "Léon, a nimble cheerful Mediterranean ocellated lizard (lézard de Provence) standing upright with cute small ink-patterned ocelli spots along his back and a lively curved tail, big bright grin, wearing a patterned Provençal neckerchief bandana and a slim gardener tool belt",
    accessoireSignatureEn: "a sturdy pair of gardener pruning shears (sécateur)",
  },
  {
    id: "margot-mante",
    operation: "traitement",
    nom: "Margot la mante religieuse",
    animal: "Mante religieuse",
    roleLabel: "Soins & traitements",
    operationsCouvertes: ["traitement"],
    descriptionFr:
      "Mante religieuse bienveillante de la garrigue, gardienne naturelle des feuilles et des soins doux au jardin.",
    descriptionVisuelleEn:
      "Margot, a charming friendly cartoon Mediterranean praying mantis standing upright, adorable expressive triangular face with big smiling eyes and slender curved antennae, neat folded wings, wearing a tiny linen herbalist satchel across her shoulder",
    accessoireSignatureEn:
      "a little round magnifying glass and a small natural herbal garden mister bottle",
  },
  {
    id: "cesar-cigale",
    operation: "recolte",
    nom: "César la cigale",
    animal: "Cigale de Provence",
    roleLabel: "Récolte",
    operationsCouvertes: ["récolte"],
    descriptionFr:
      "Cigale provençale enjouée en canotier de paille, toujours chantante avec son panier d'osier pour la récolte.",
    descriptionVisuelleEn:
      "César, a joyful plump Provençal cicada standing upright with crisp delicate ink-veined translucent wings on his back, cheerful big smiling eyes and musical happy posture, wearing a jaunty little straw boater hat (canotier)",
    accessoireSignatureEn:
      "a woven Provençal wicker harvest basket carried over one arm",
  },
  {
    id: "bastien-tortue",
    operation: "entretien",
    nom: "Bastien la tortue d'Hermann",
    animal: "Tortue d'Hermann",
    roleLabel: "Entretien & organisation",
    operationsCouvertes: ["autre"],
    descriptionFr:
      "Tortue d'Hermann posée et malicieuse à petites lunettes rondes, gardienne de l'entretien, du paillage et du carnet de jardin.",
    descriptionVisuelleEn:
      "Bastien, a friendly cheerful Mediterranean Hermann's tortoise (tortue d'Hermann) standing upright with a distinct black-and-white patterned domed shell, warm gentle smile, wearing tiny round wire spectacles",
    accessoireSignatureEn:
      "a little wooden hand rake and a tiny garden checklist notebook",
  },
] as const;

export const PERSONNAGES_PAR_OPERATION: Record<OperationBD, PersonnageBD> = {
  plantation: PERSONNAGES_BD[0],
  arrosage: PERSONNAGES_BD[1],
  taille: PERSONNAGES_BD[2],
  traitement: PERSONNAGES_BD[3],
  recolte: PERSONNAGES_BD[4],
  entretien: PERSONNAGES_BD[5],
};

export const OPERATIONS_BD: readonly OperationBD[] = [
  "plantation",
  "arrosage",
  "taille",
  "traitement",
  "recolte",
  "entretien",
];

/**
 * Convertit un type de tâche Prisma (arrosage, semis, préparation sol, etc.)
 * en opération canonique de BD.
 */
export function normaliserOperationBD(typeTache: string): OperationBD {
  const normalise = typeTache
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (
    normalise.includes("plant") ||
    normalise.includes("semi") ||
    normalise.includes("sol") ||
    normalise.includes("terre") ||
    normalise.includes("repiqu")
  ) {
    return "plantation";
  }
  if (normalise.includes("arros") || normalise.includes("eau") || normalise.includes("irrig")) {
    return "arrosage";
  }
  if (normalise.includes("taill") || normalise.includes("elag") || normalise.includes("pinc")) {
    return "taille";
  }
  if (
    normalise.includes("trait") ||
    normalise.includes("soin") ||
    normalise.includes("malad") ||
    normalise.includes("parasit") ||
    normalise.includes("bouillie")
  ) {
    return "traitement";
  }
  if (normalise.includes("recolt") || normalise.includes("cueill")) {
    return "recolte";
  }
  return "entretien";
}

export function getPersonnagePourOperation(operation: OperationBD): PersonnageBD {
  return PERSONNAGES_PAR_OPERATION[operation] ?? PERSONNAGES_PAR_OPERATION.entretien;
}

export function getPersonnageParId(id: string): PersonnageBD | undefined {
  return PERSONNAGES_BD.find((p) => p.id === id);
}
