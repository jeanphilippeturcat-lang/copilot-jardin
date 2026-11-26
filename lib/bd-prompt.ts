export type MaquetteGazetteId =
  | "broadsheet"
  | "hero-panoramique"
  | "planche-bd"
  | "almanach-botanique"
  | "flash-jardin"
  | "courrier-provence";

export interface MaquetteGazette {
  id: MaquetteGazetteId;
  nom: string;
  descriptionFr: string;
}

export interface DirectionArtistiqueSemaine {
  saisonLabelFr: string;
  ornementSaisonEn: string;
  angleCameraEn: string;
  decorJardinEn: string;
  presentationPlanteEn: string;
}

export interface DonneesContexteJardin {
  semaineLibelle: string;
  moisAnnee: string;
  descriptionJardin: string;
  descriptionMeteo: string;
  descriptionTachesSemaine: string;
  descriptionTachesEnAttente: string;
  descriptionIntentions: string;
  descriptionInterventions: string;
  actionsClesResume: string;
  guidePersonnages: string;
}

export interface DonneesPromptChronique {
  maquette: MaquetteGazette;
  directionArtistique: DirectionArtistiqueSemaine;
  dateBanner: string;
  gardenReportText: string;
  weatherCondition: string;
  weatherVisual: string;
  tempMax: string;
  tempMin: string;
  featuredPlantVisual: string;
  featuredPlantSpeech: string;
  mainHeadline: string;
  leadParagraph: string;
  pestPanelVisual: string;
  pestBubble1: string;
  pestBubble2: string;
  mainComicVisual: string;
  mainBubble1: string;
  mainBubble2: string;
  characterName: string;
  characterQuote: string;
  task1: string;
  task1Icon: string;
  task2: string;
  task2Icon: string;
  task3: string;
  task3Icon: string;
  mascotVisual: string;
  contexte?: DonneesContexteJardin;
}

export const MAQUETTES_GAZETTE: readonly MaquetteGazette[] = [
  {
    id: "broadsheet",
    nom: "Gazette Classique (3 colonnes)",
    descriptionFr: "Une de journal traditionnelle à 3 colonnes équilibrées et filets nets.",
  },
  {
    id: "hero-panoramique",
    nom: "Édition Spéciale (Panoramique)",
    descriptionFr:
      "Grande scène BD panoramique en haut de page et bandeau d'informations en bas.",
  },
  {
    id: "planche-bd",
    nom: "Planche BD (Séquence 3 cases)",
    descriptionFr:
      "Supplément illustré à gauche en 3 cases narratives et colonne almanach à droite.",
  },
  {
    id: "almanach-botanique",
    nom: "L'Almanach Botanique",
    descriptionFr:
      "Planche centrale gravée sur la plante vedette, encadrée par la BD et la checklist.",
  },
  {
    id: "flash-jardin",
    nom: "Flash Jardin (Tabloïd)",
    descriptionFr:
      "Gros titre percutant à la une, grande case d'action à gauche et colonnes rapides à droite.",
  },
  {
    id: "courrier-provence",
    nom: "Courrier de Provence (60/40)",
    descriptionFr:
      "Mise en page asymétrique presse régionale 1950 avec grand portrait mascotte à droite.",
  },
] as const;

const ANGLES_CAMERA_EN: readonly string[] = [
  "low worm's-eye angle from soil level looking slightly upward through leaves and sprouts",
  "high three-quarter bird's-eye view showing garden beds, paths, and lush rows",
  "lively close-up mid-shot focusing on expressive face, hands, tools, and foliage in motion",
  "wide storybook composition with rich foreground plants framing the character in the midground",
  "cozy eye-level diagonal perspective creating depth along the garden rows",
  "playful over-the-shoulder framing following the character toward the featured plants",
];

const DECORS_JARDIN_EN: readonly string[] = [
  "beside a rustic wooden potting bench cluttered with clay pots, twine, and hand-lettered stakes",
  "among tidy raised wooden vegetable beds with bamboo trellises and lush foliage",
  "beneath the gnarled branches of an old Provençal olive tree bordered by lavender tufts",
  "next to a charming small glass cold-frame, terracotta saucers, and garden tools",
  "along a sun-dappled Provençal terrace with climbing vines, wooden pergola beams, and stone steps",
  "near a cozy wooden garden tool shed, wheelbarrow, and neatly coiled garden hose",
  "alongside a classic Provençal dry-stone garden wall with rosemary and thyme spilling over",
];

const PRESENTATIONS_PLANTE_EN: readonly string[] = [
  "a charming comic plant character growing directly in a garden bed with tiny joyful eyes and expressive leaves",
  "a detailed vintage botanical specimen sketch with a subtle cheerful face and a classic ink ribbon label",
  "a lively potted plant perched on a small wooden garden stool, gesturing cheerfully with its leaves",
  "a playful cross-section botanical drawing showing both curling roots underground and happy smiling shoots above",
  "an expressive flowering or leafy stem framed inside an oval botanical medallion with fine ink linework",
];

function choisirElementAleatoire<T>(liste: readonly T[]): T {
  const index = Math.floor(Math.random() * liste.length);
  return liste[index] ?? liste[0];
}

/**
 * Extrait l'identifiant de maquette enregistré dans le bloc de contexte d'un prompt existant.
 */
export function extraireMaquetteDepuisPrompt(
  promptImage: string | null | undefined
): MaquetteGazetteId | null {
  if (!promptImage) return null;
  const match = /\[maquette:([a-z-]+)\]/.exec(promptImage);
  if (!match) return null;
  const candidate = match[1] as MaquetteGazetteId;
  return MAQUETTES_GAZETTE.some((m) => m.id === candidate) ? candidate : null;
}

/**
 * Sélectionne aléatoirement une maquette de gazette en évitant les identifiants récents.
 */
export function choisirMaquetteAleatoire(
  exclureIds: readonly (MaquetteGazetteId | null | undefined)[] = []
): MaquetteGazette {
  const exclus = new Set(exclureIds.filter((id): id is MaquetteGazetteId => Boolean(id)));
  const candidates = MAQUETTES_GAZETTE.filter((m) => !exclus.has(m.id));
  const pool = candidates.length > 0 ? candidates : MAQUETTES_GAZETTE;
  return choisirElementAleatoire(pool);
}

/**
 * Génère une direction artistique variée adaptée à la saison (mois 0..11).
 */
export function choisirDirectionArtistique(dateReference: Date): DirectionArtistiqueSemaine {
  const mois = dateReference.getMonth();
  let saisonLabelFr: string;
  let ornementSaisonEn: string;

  if (mois >= 2 && mois <= 4) {
    saisonLabelFr = "Printemps";
    ornementSaisonEn =
      "tiny crisp ink olive blossoms, curling seedling sprouts, and small swallows in the margins";
  } else if (mois >= 5 && mois <= 7) {
    saisonLabelFr = "Été";
    ornementSaisonEn =
      "crisp ink Provençal lavender sprigs, little cicada silhouettes, and geometric sunburst flourishes";
  } else if (mois >= 8 && mois <= 10) {
    saisonLabelFr = "Automne";
    ornementSaisonEn =
      "crisp ink grapevine tendrils, small figs, olive branches, and a few drifting autumn leaves";
  } else {
    saisonLabelFr = "Hiver";
    ornementSaisonEn =
      "crisp ink rosemary twigs, olive sprigs, tiny pinecones, and clean geometric winter star dividers";
  }

  return {
    saisonLabelFr,
    ornementSaisonEn,
    angleCameraEn: choisirElementAleatoire(ANGLES_CAMERA_EN),
    decorJardinEn: choisirElementAleatoire(DECORS_JARDIN_EN),
    presentationPlanteEn: choisirElementAleatoire(PRESENTATIONS_PLANTE_EN),
  };
}

function nettoyerGuillemets(texte: string): string {
  return texte.replace(/"/g, "'").replace(/\s+/g, " ").trim();
}

function blocReglesEInk(ornementSaisonEn: string): string {
  return `E-INK MONOCHROME VISUAL & QUALITY RULES:
- Strictly high-contrast PURE BLACK INK (#000000) on a CRISP PURE WHITE (#FFFFFF) background, engineered to display sharply on a low-cost monochrome e-ink screen.
- NO gray paper tint, NO muddy gray washes, NO soft shading gradients, NO sepia, NO color. Use only clean Franco-Belgian ligne claire ink outlines, deliberate black-and-white hatching or stippling, and generous white breathing room.
- Subtle seasonal ink border ornaments: ${nettoyerGuillemets(ornementSaisonEn)}.
- All text must be spelled accurately in bold, clean, highly legible French comic lettering and vintage newspaper typography. No gibberish, no extra watermarks, crisp black ink borders separating panels cleanly.`;
}

function construireCorpsBroadsheet(d: DonneesPromptChronique): string {
  return `LAYOUT ARCHITECTURE — CLASSIC THREE-COLUMN BROADSHEET:
TOP MASTHEAD:
- Large ornate vintage serif title across the top reading: "THE GARDEN CHRONICLE" flanked by tiny seasonal botanical ink sprigs.
- Directly below, a crisp black horizontal banner between double ink rules with white bold sans-serif text reading: "${nettoyerGuillemets(d.dateBanner)}"

THREE-COLUMN GRID BELOW (25% / 50% / 25%):

LEFT COLUMN (25% width):
1. Top Box (crisp double-line frame with outlined uppercase header "RAPPORT DU JARDIN"): clean black text reading: "${nettoyerGuillemets(d.gardenReportText)}"
2. Middle Box (solid black header bar with white text "MÉTÉO DE LA SEMAINE"): on the left, a crisp monochrome ink weather illustration of ${nettoyerGuillemets(d.weatherVisual)}; on the right, bold black text reading: "${nettoyerGuillemets(d.weatherCondition)}\\nMax: ${nettoyerGuillemets(d.tempMax)}\\nMin: ${nettoyerGuillemets(d.tempMin)}"
3. Bottom Box (double-ruled header "PLANTE EN VEDETTE"): ink comic illustration of ${nettoyerGuillemets(d.featuredPlantVisual)} with a clean white speech bubble reading: "${nettoyerGuillemets(d.featuredPlantSpeech)}"

CENTER COLUMN (50% width):
1. Main Headline across the top in bold condensed black uppercase sans-serif: "${nettoyerGuillemets(d.mainHeadline).toUpperCase()}"
2. Below headline left: short editorial lead reading "${nettoyerGuillemets(d.leadParagraph)}", followed by subheader "VIGILANCE AU JARDIN" and a framed comic panel showing ${nettoyerGuillemets(d.pestPanelVisual)} with two speech bubbles: "${nettoyerGuillemets(d.pestBubble1)}" and "${nettoyerGuillemets(d.pestBubble2)}".
3. Below headline right: large main comic panel showing ${nettoyerGuillemets(d.mainComicVisual)}, featuring crisp white comic speech bubbles reading "${nettoyerGuillemets(d.mainBubble1)}" and "${nettoyerGuillemets(d.mainBubble2)}".
4. Bottom Banner spanning center column: outlined vintage banner reading "VEDETTE : ${nettoyerGuillemets(d.characterName).toUpperCase()}" above an ink quote reading: "${nettoyerGuillemets(d.characterQuote)}"

RIGHT COLUMN (25% width):
1. Top Box (solid black header bar "CHRONIQUE DES TÂCHES"): vertical checklist with crisp empty square checkboxes and small black line-art icons:
- [ ] ${nettoyerGuillemets(d.task1)} (icon: ${nettoyerGuillemets(d.task1Icon)})
- [ ] ${nettoyerGuillemets(d.task2)} (icon: ${nettoyerGuillemets(d.task2Icon)})
- [ ] ${nettoyerGuillemets(d.task3)} (icon: ${nettoyerGuillemets(d.task3Icon)})
2. Bottom Box (header "PERSONNAGE DU JOUR"): full-body comic ink mascot illustration of ${nettoyerGuillemets(d.mascotVisual)}.`;
}

function construireCorpsHeroPanoramique(d: DonneesPromptChronique): string {
  return `LAYOUT ARCHITECTURE — WIDESCREEN SPECIAL EDITION (TOP PANORAMA + BOTTOM STRIP):
COMPACT TOP MASTHEAD:
- Elegant vintage French gazette banner across the top reading "THE GARDEN CHRONICLE" in bold classic serif inside an ornamental Art Nouveau black ink rule frame, with the dateline "${nettoyerGuillemets(d.dateBanner)}" neatly tucked below in small uppercase lettering.

UPPER HERO BAND (58% of page height, full width):
- Left 72% width: Bold full-width headline reading "${nettoyerGuillemets(d.mainHeadline).toUpperCase()}" directly above a wide panoramic widescreen comic illustration showing ${nettoyerGuillemets(d.mainComicVisual)}, with two crisp white speech bubbles: "${nettoyerGuillemets(d.mainBubble1)}" and "${nettoyerGuillemets(d.mainBubble2)}". Below the panel, a sleek single-line caption reading: "${nettoyerGuillemets(d.leadParagraph)}"
- Right 28% width: Clean tall box with open-framed header "CHRONIQUE DES TÂCHES" containing a bold checklist with empty square checkboxes and tiny line-art icons:
  - [ ] ${nettoyerGuillemets(d.task1)} (icon: ${nettoyerGuillemets(d.task1Icon)})
  - [ ] ${nettoyerGuillemets(d.task2)} (icon: ${nettoyerGuillemets(d.task2Icon)})
  - [ ] ${nettoyerGuillemets(d.task3)} (icon: ${nettoyerGuillemets(d.task3Icon)})
  Directly beneath the checklist inside the same column, a compact "MÉTÉO" box with a crisp ink illustration of ${nettoyerGuillemets(d.weatherVisual)} and bold text: "${nettoyerGuillemets(d.weatherCondition)} · Max ${nettoyerGuillemets(d.tempMax)} / Min ${nettoyerGuillemets(d.tempMin)}".

LOWER HORIZONTAL STRIP (30% of page height, split into 3 equal framed cards):
1. Left Card (header "PLANTE EN VEDETTE"): crisp comic illustration of ${nettoyerGuillemets(d.featuredPlantVisual)} with speech bubble "${nettoyerGuillemets(d.featuredPlantSpeech)}", plus brief note: "${nettoyerGuillemets(d.gardenReportText)}"
2. Center Card (header "VIGILANCE AU JARDIN"): crisp comic vignette showing ${nettoyerGuillemets(d.pestPanelVisual)} with small speech bubbles "${nettoyerGuillemets(d.pestBubble1)}" and "${nettoyerGuillemets(d.pestBubble2)}".
3. Right Card (ribbon header "${nettoyerGuillemets(d.characterName).toUpperCase()}"): charming ink portrait of ${nettoyerGuillemets(d.mascotVisual)} beside a bold quote bubble reading: "${nettoyerGuillemets(d.characterQuote)}"`;
}

function construireCorpsPlancheBD(d: DonneesPromptChronique): string {
  return `LAYOUT ARCHITECTURE — SUNDAY COMIC SUPPLEMENT (3-PANEL COMIC STRIP LEFT + ALMANAC SIDEBAR RIGHT):
TOP HEADER BAR:
- Playful vintage Franco-Belgian weekly comic journal masthead reading "THE GARDEN CHRONICLE" in bold hand-lettered ink display type with a decorative double rule beneath and dateline "${nettoyerGuillemets(d.dateBanner)}".

TWO-ZONE ASYMMETRIC BODY BELOW (68% left / 32% right):

LEFT COMIC ZONE (68% width):
- Big lively comic headline banner across the top: "${nettoyerGuillemets(d.mainHeadline).toUpperCase()}" with short subtitle "${nettoyerGuillemets(d.leadParagraph)}"
- Below the headline, a 3-panel sequential comic page layout with crisp thick black panel borders and clean white gutters:
  - Top-left panel (medium): "PLANTE EN VEDETTE" — comic scene of ${nettoyerGuillemets(d.featuredPlantVisual)} saying "${nettoyerGuillemets(d.featuredPlantSpeech)}" with a tiny corner caption "${nettoyerGuillemets(d.gardenReportText)}".
  - Top-right panel (medium): "VIGILANCE" — comic scene showing ${nettoyerGuillemets(d.pestPanelVisual)} with speech bubbles "${nettoyerGuillemets(d.pestBubble1)}" and "${nettoyerGuillemets(d.pestBubble2)}".
  - Bottom wide panel (full width of left zone, tallest showcase panel): main action scene showing ${nettoyerGuillemets(d.mainComicVisual)} with clear speech bubbles "${nettoyerGuillemets(d.mainBubble1)}" and "${nettoyerGuillemets(d.mainBubble2)}".

RIGHT ALMANAC SIDEBAR (32% width, framed like a vintage field almanac):
1. Top Box ("MÉTÉO"): crisp black ink badge illustrating ${nettoyerGuillemets(d.weatherVisual)}, paired with bold text "${nettoyerGuillemets(d.weatherCondition)}\\nMax: ${nettoyerGuillemets(d.tempMax)} · Min: ${nettoyerGuillemets(d.tempMin)}".
2. Middle Box ("CHRONIQUE DES TÂCHES" with vintage ribbon header): crisp checklist with empty checkboxes and small ink icons:
   - [ ] ${nettoyerGuillemets(d.task1)} (icon: ${nettoyerGuillemets(d.task1Icon)})
   - [ ] ${nettoyerGuillemets(d.task2)} (icon: ${nettoyerGuillemets(d.task2Icon)})
   - [ ] ${nettoyerGuillemets(d.task3)} (icon: ${nettoyerGuillemets(d.task3Icon)})
3. Bottom Box ("${nettoyerGuillemets(d.characterName).toUpperCase()}"): full-body ink mascot drawing of ${nettoyerGuillemets(d.mascotVisual)} with an expressive quote banner reading: "${nettoyerGuillemets(d.characterQuote)}"`;
}

function construireCorpsAlmanachBotanique(d: DonneesPromptChronique): string {
  return `LAYOUT ARCHITECTURE — BOTANICAL ALMANAC & FIELD GUIDE (ORNATE CENTER PLATE + FLANKING COLUMNS):
TOP ENGRAVED MASTHEAD:
- Classic 19th-century French botanical almanac header reading "THE GARDEN CHRONICLE" in refined engraved serif capitals, surrounded by crisp black botanical ink corner flourishes and a slim dateline rule reading "${nettoyerGuillemets(d.dateBanner)}".
- Full-width centered editorial headline directly underneath in bold serif uppercase: "${nettoyerGuillemets(d.mainHeadline).toUpperCase()}"

THREE-SECTION ALMANAC BODY (33% left / 34% center / 33% right):

LEFT COLUMN (33% width):
1. Large square-ish main comic panel at top showing ${nettoyerGuillemets(d.mainComicVisual)} with clean speech bubbles "${nettoyerGuillemets(d.mainBubble1)}" and "${nettoyerGuillemets(d.mainBubble2)}".
2. Bottom framed vignette ("VIGILANCE AU JARDIN"): ink comic panel showing ${nettoyerGuillemets(d.pestPanelVisual)} with short speech bubbles "${nettoyerGuillemets(d.pestBubble1)}" and "${nettoyerGuillemets(d.pestBubble2)}".

CENTER BOTANICAL PLATE (34% width, tall ornamental double-line medallion frame):
1. Top banner: "PLANTE EN VEDETTE" — large detailed ligne-claire botanical showcase illustration of ${nettoyerGuillemets(d.featuredPlantVisual)} with a neat speech bubble "${nettoyerGuillemets(d.featuredPlantSpeech)}".
2. Middle editorial note framed by delicate ink dividers: "${nettoyerGuillemets(d.leadParagraph)}" followed by "RAPPORT DU JARDIN : ${nettoyerGuillemets(d.gardenReportText)}"
3. Bottom quote cartouche: "${nettoyerGuillemets(d.characterName).toUpperCase()}" — "${nettoyerGuillemets(d.characterQuote)}"

RIGHT COLUMN (33% width):
1. Top Weather Engraving ("MÉTÉO DE LA SEMAINE"): crisp monochrome ink weather scene of ${nettoyerGuillemets(d.weatherVisual)} with bold lettering "${nettoyerGuillemets(d.weatherCondition)}\\nMax: ${nettoyerGuillemets(d.tempMax)} | Min: ${nettoyerGuillemets(d.tempMin)}".
2. Middle Checklist Box ("CHRONIQUE DES TÂCHES" with decorative ink bracket border):
   - [ ] ${nettoyerGuillemets(d.task1)} (icon: ${nettoyerGuillemets(d.task1Icon)})
   - [ ] ${nettoyerGuillemets(d.task2)} (icon: ${nettoyerGuillemets(d.task2Icon)})
   - [ ] ${nettoyerGuillemets(d.task3)} (icon: ${nettoyerGuillemets(d.task3Icon)})
3. Bottom Mascot Stamp: crisp full-body ink drawing of ${nettoyerGuillemets(d.mascotVisual)} inside an oval stamp border.`;
}

function construireCorpsFlashJardin(d: DonneesPromptChronique): string {
  return `LAYOUT ARCHITECTURE — ENERGETIC TABLOID "FLASH JARDIN" FRONT PAGE:
BOLD TABLOID TOP BANNER:
- Compact top nameplate reading "THE GARDEN CHRONICLE" on the left with a crisp vintage black stamp badge reading "ÉDITION HEBDO" on the right, and dateline "${nettoyerGuillemets(d.dateBanner)}" in a thin ruled strip.
- Directly below, an extra-large, high-impact bold condensed uppercase front-page headline spanning the full width: "${nettoyerGuillemets(d.mainHeadline).toUpperCase()}"

ASYMMETRIC TWO-COLUMN TABLOID BODY (58% left / 42% right):

LEFT FEATURE ZONE (58% width):
1. Short bold lead deck above the art: "${nettoyerGuillemets(d.leadParagraph)}"
2. Dominant hero comic illustration (taking most of the left side) with crisp black ink border showing ${nettoyerGuillemets(d.mainComicVisual)}, featuring dynamic speech bubbles "${nettoyerGuillemets(d.mainBubble1)}" and "${nettoyerGuillemets(d.mainBubble2)}".
3. Slim bottom strip under the hero panel split in two:
   - Left half ("RAPPORT DU JARDIN"): "${nettoyerGuillemets(d.gardenReportText)}"
   - Right half ("${nettoyerGuillemets(d.characterName).toUpperCase()}"): small cheerful ink bust of ${nettoyerGuillemets(d.mascotVisual)} quoting "${nettoyerGuillemets(d.characterQuote)}"

RIGHT ACTION COLUMN (42% width):
1. Top Bold Checklist Box (thick black outer frame, inverted black title bar "CHRONIQUE DES TÂCHES"):
   - [ ] ${nettoyerGuillemets(d.task1)} (icon: ${nettoyerGuillemets(d.task1Icon)})
   - [ ] ${nettoyerGuillemets(d.task2)} (icon: ${nettoyerGuillemets(d.task2Icon)})
   - [ ] ${nettoyerGuillemets(d.task3)} (icon: ${nettoyerGuillemets(d.task3Icon)})
2. Middle side-by-side mini-cards:
   - Left mini-card ("MÉTÉO"): ink icon of ${nettoyerGuillemets(d.weatherVisual)} + "${nettoyerGuillemets(d.weatherCondition)}\\n${nettoyerGuillemets(d.tempMin)} / ${nettoyerGuillemets(d.tempMax)}"
   - Right mini-card ("PLANTE"): ink drawing of ${nettoyerGuillemets(d.featuredPlantVisual)} with mini bubble "${nettoyerGuillemets(d.featuredPlantSpeech)}"
3. Bottom framed panel ("VIGILANCE AU JARDIN"): crisp comic scene of ${nettoyerGuillemets(d.pestPanelVisual)} with speech bubbles "${nettoyerGuillemets(d.pestBubble1)}" and "${nettoyerGuillemets(d.pestBubble2)}".`;
}

function construireCorpsCourrierProvence(d: DonneesPromptChronique): string {
  return `LAYOUT ARCHITECTURE — 1950s FRENCH REGIONAL PRESS "COURRIER DE PROVENCE" (60/40 SPLIT):
CLASSIC REGIONAL NEWSPAPER MASTHEAD:
- Clean 1950s French newspaper masthead reading "THE GARDEN CHRONICLE" in strong slab-serif capitals centered between two small editorial "ear" boxes (left ear: "ÉDITION MÉDITERRANÉE", right ear: weather badge showing ${nettoyerGuillemets(d.weatherVisual)} + "${nettoyerGuillemets(d.tempMax)} / ${nettoyerGuillemets(d.tempMin)}").
- Thin double horizontal rule beneath with dateline: "${nettoyerGuillemets(d.dateBanner)} · ${nettoyerGuillemets(d.weatherCondition)}"

TWO-COLUMN ASYMMETRIC BODY (60% left / 40% right separated by a crisp vertical ink rule):

LEFT EDITORIAL & COMIC COLUMN (60% width):
1. Large serif headline: "${nettoyerGuillemets(d.mainHeadline).toUpperCase()}"
2. Two-column mini text intro below headline: left side "${nettoyerGuillemets(d.leadParagraph)}", right side "${nettoyerGuillemets(d.gardenReportText)}".
3. Main horizontal comic panel below text showing ${nettoyerGuillemets(d.mainComicVisual)} with clear speech bubbles "${nettoyerGuillemets(d.mainBubble1)}" and "${nettoyerGuillemets(d.mainBubble2)}".
4. Bottom row split into two crisp comic vignettes:
   - Left vignette ("PLANTE EN VEDETTE"): ${nettoyerGuillemets(d.featuredPlantVisual)} with speech bubble "${nettoyerGuillemets(d.featuredPlantSpeech)}".
   - Right vignette ("VIGILANCE AU JARDIN"): ${nettoyerGuillemets(d.pestPanelVisual)} with speech bubbles "${nettoyerGuillemets(d.pestBubble1)}" and "${nettoyerGuillemets(d.pestBubble2)}".

RIGHT SHOWCASE & TASKS COLUMN (40% width):
1. Top Character Feature Box (outlined banner "À L'HONNEUR : ${nettoyerGuillemets(d.characterName).toUpperCase()}"): tall expressive full-body ink illustration of ${nettoyerGuillemets(d.mascotVisual)} with a ribbon quote below: "${nettoyerGuillemets(d.characterQuote)}"
2. Bottom Checklist Box (clean double-ruled frame titled "CHRONIQUE DES TÂCHES"):
   - [ ] ${nettoyerGuillemets(d.task1)} (icon: ${nettoyerGuillemets(d.task1Icon)})
   - [ ] ${nettoyerGuillemets(d.task2)} (icon: ${nettoyerGuillemets(d.task2Icon)})
   - [ ] ${nettoyerGuillemets(d.task3)} (icon: ${nettoyerGuillemets(d.task3Icon)})`;
}

function construireCorpsSelonMaquette(d: DonneesPromptChronique): string {
  switch (d.maquette.id) {
    case "hero-panoramique":
      return construireCorpsHeroPanoramique(d);
    case "planche-bd":
      return construireCorpsPlancheBD(d);
    case "almanach-botanique":
      return construireCorpsAlmanachBotanique(d);
    case "flash-jardin":
      return construireCorpsFlashJardin(d);
    case "courrier-provence":
      return construireCorpsCourrierProvence(d);
    case "broadsheet":
    default:
      return construireCorpsBroadsheet(d);
  }
}

/**
 * Construit le prompt prêt à copier (et utilisé pour la génération d'image IA)
 * au format "THE GARDEN CHRONICLE" (une de journal 16:9 strictement noir & blanc
 * optimisée pour écran e-ink, avec maquette variée et direction artistique dynamique).
 */
export function construirePromptChronique(d: DonneesPromptChronique): string {
  const entete = `A crisp high-contrast black-and-white vintage newspaper front page in 16:9 widescreen format, drawn in clean Franco-Belgian comic strip ink style (clear line / ligne claire) specifically designed for sharp display on a monochrome e-ink screen. Pure black ink on pure white background, clean ink linework, crisp cross-hatching and stippling, zero gray washes, zero color.`;

  const corps = construireCorpsSelonMaquette(d);
  const regles = blocReglesEInk(d.directionArtistique.ornementSaisonEn);

  const blocContexte = d.contexte
    ? `

---
DONNÉES DU JARDIN — CONTEXTE DE LA SEMAINE (référence uniquement, ne pas imprimer ce bloc brut dans l'image ; utile pour vérifier ou ajuster facilement les plantes, la météo, les tâches et les personnages) :

MAQUETTE & DIRECTION ARTISTIQUE :
Maquette sélectionnée : ${d.maquette.nom} [maquette:${d.maquette.id}] — ${d.maquette.descriptionFr}
Saison : ${d.directionArtistique.saisonLabelFr}

SEMAINE & CLIMAT :
${d.contexte.semaineLibelle} (${d.contexte.moisAnnee}) — Sud de la France, climat méditerranéen

ACTIONS CLÉS RETENUES CETTE SEMAINE :
${d.contexte.actionsClesResume}

MÉTÉO DES PROCHAINS JOURS :
${d.contexte.descriptionMeteo}

ZONES & PLANTES DU JARDIN :
${d.contexte.descriptionJardin}

TÂCHES DU CALENDRIER CETTE SEMAINE :
${d.contexte.descriptionTachesSemaine}

TÂCHES EN ATTENTE :
${d.contexte.descriptionTachesEnAttente}

PROJETS DE PLANTATION EN COURS :
${d.contexte.descriptionIntentions}

INTERVENTIONS RÉCENTES (21 JOURS) :
${d.contexte.descriptionInterventions}

CASTING MÉDITERRANÉEN RÉCURRENT (COHÉRENCE DES PERSONNAGES) :
${d.contexte.guidePersonnages}`
    : "";

  return `${entete}\n\n${corps}\n\n${regles}${blocContexte}`;
}
