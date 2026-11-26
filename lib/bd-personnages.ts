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
    id: "ragout-lapin",
    operation: "desherbage",
    nom: "Ragoût le lapin",
    animal: "Lapin de garenne",
    roleLabel: "Désherbage",
    operationsCouvertes: ["désherbage"],
    descriptionFr:
      "Lapin de garenne vif et malicieux de la garrigue, champion du désherbage qui débarrasse les massifs et le potager des mauvaises herbes.",
    descriptionVisuelleEn:
      "Ragoût, a lively mischievous Provençal wild rabbit (lapin de garenne) standing upright on two legs with tall expressive alert ears, a twitchy nose, bushy little cotton tail, and a cheeky grin, wearing rolled-up canvas gardener overalls and a knotted bandana around his neck",
    accessoireSignatureEn:
      "a sturdy hand weeding fork (sarcloir) and a woven trug basket overflowing with freshly pulled garden weeds and dandelion tufts",
  },
  {
    id: "gizelle-tourterelle",
    operation: "meteo",
    nom: "Gizelle la tourterelle",
    animal: "Tourterelle de Provence",
    roleLabel: "Prévisions météo",
    operationsCouvertes: ["météo", "prévisions"],
    descriptionFr:
      "Tourterelle provençale élégante à petite écharpe et girouette de jardin, toujours perchée pour annoncer les prévisions météo de la semaine.",
    descriptionVisuelleEn:
      "Gizelle, a graceful cheerful Provençal collared dove (tourterelle) standing upright with a neat dark ink neck-ring stripe, expressive bright eyes, soft feather tufts, and a warm welcoming smile, wearing a tiny patterned Provençal neck scarf like a friendly weather forecaster",
    accessoireSignatureEn:
      "a miniature vintage wrought-iron weathervane (girouette) and a little barometer gauge or tiny folding umbrella",
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
  desherbage: PERSONNAGES_BD[5],
  meteo: PERSONNAGES_BD[6],
  entretien: PERSONNAGES_BD[7],
};

export const OPERATIONS_BD: readonly OperationBD[] = [
  "plantation",
  "arrosage",
  "taille",
  "traitement",
  "recolte",
  "desherbage",
  "meteo",
  "entretien",
];

function detecterOperationDepuisTexte(texteNormalise: string): OperationBD | null {
  if (
    texteNormalise.includes("desherb") ||
    texteNormalise.includes("mauvais") ||
    texteNormalise.includes("adventic") ||
    texteNormalise.includes("sarcl") ||
    texteNormalise.includes("binag") ||
    texteNormalise.includes("biner") ||
    texteNormalise.includes("chiendent") ||
    texteNormalise.includes("pissenlit") ||
    texteNormalise.includes("weed")
  ) {
    return "desherbage";
  }
  if (
    texteNormalise.includes("meteo") ||
    texteNormalise.includes("prevision") ||
    texteNormalise.includes("bulletin") ||
    texteNormalise.includes("climat")
  ) {
    return "meteo";
  }
  if (
    texteNormalise.includes("plant") ||
    texteNormalise.includes("semi") ||
    texteNormalise.includes("sol") ||
    texteNormalise.includes("terre") ||
    texteNormalise.includes("repiqu")
  ) {
    return "plantation";
  }
  if (
    texteNormalise.includes("arros") ||
    texteNormalise.includes("eau") ||
    texteNormalise.includes("irrig")
  ) {
    return "arrosage";
  }
  if (
    texteNormalise.includes("taill") ||
    texteNormalise.includes("elag") ||
    texteNormalise.includes("pinc")
  ) {
    return "taille";
  }
  if (
    texteNormalise.includes("trait") ||
    texteNormalise.includes("soin") ||
    texteNormalise.includes("malad") ||
    texteNormalise.includes("parasit") ||
    texteNormalise.includes("bouillie")
  ) {
    return "traitement";
  }
  if (texteNormalise.includes("recolt") || texteNormalise.includes("cueill")) {
    return "recolte";
  }
  return null;
}

/**
 * Convertit un type de tâche Prisma (arrosage, semis, désherbage, etc.)
 * en opération canonique de BD. Si le type est générique ("autre"), le texte
 * complémentaire (titre/description) est également inspecté.
 */
export function normaliserOperationBD(
  typeTache: string,
  texteContexte?: string
): OperationBD {
  const normalise = typeTache
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const depuisType = detecterOperationDepuisTexte(normalise);
  if (depuisType) {
    return depuisType;
  }

  if (texteContexte) {
    const contexteNormalise = texteContexte
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    const depuisContexte = detecterOperationDepuisTexte(contexteNormalise);
    if (depuisContexte) {
      return depuisContexte;
    }
  }

  return "entretien";
}

export function getPersonnagePourOperation(operation: OperationBD): PersonnageBD {
  return PERSONNAGES_PAR_OPERATION[operation] ?? PERSONNAGES_PAR_OPERATION.entretien;
}

export function getPersonnageParId(id: string): PersonnageBD | undefined {
  return PERSONNAGES_BD.find((p) => p.id === id);
}
