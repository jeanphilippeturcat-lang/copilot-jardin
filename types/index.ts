export type TypeZone = "potager" | "verger" | "massif" | "serre" | "pelouse";
export type TypePlante = "légume" | "arbre" | "arbuste" | "fleur" | "aromatique";
export type Exposition = "nord" | "sud" | "est" | "ouest" | "mi-ombre";
export type StatutTache = "a_faire" | "faite" | "ignoree";
export type TypeTache =
  | "arrosage"
  | "taille"
  | "semis"
  | "plantation"
  | "préparation sol"
  | "traitement"
  | "récolte"
  | "désherbage"
  | "autre";

export interface Zone {
  id: string;
  nom: string;
  type: TypeZone;
  surface: number | null;
  exposition: Exposition | null;
  createdAt: string;
  updatedAt: string;
  plantes?: Plante[];
}

export interface Plante {
  id: string;
  nom: string;
  nomLatine: string | null;
  type: TypePlante;
  datePlantee: string | null;
  zoneId: string;
  zone?: Zone;
  derniereObservation?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tache {
  id: string;
  titre: string;
  description: string | null;
  type: TypeTache;
  statut: StatutTache;
  dateEcheance: string | null;
  planteId: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export type OperationBD =
  | "plantation"
  | "arrosage"
  | "taille"
  | "traitement"
  | "recolte"
  | "desherbage"
  | "meteo"
  | "entretien";

export interface PersonnageBD {
  id: string;
  operation: OperationBD;
  nom: string;
  animal: string;
  roleLabel: string;
  operationsCouvertes: string[];
  descriptionFr: string;
  descriptionVisuelleEn: string;
  accessoireSignatureEn: string;
}

export interface PersonnageBDAvecPortrait extends PersonnageBD {
  portraitUrl: string | null;
}

export interface CaseBD {
  numero: number;
  operation: OperationBD;
  personnageId: string;
  personnageNom: string;
  actionCle: string;
  planteOuZone?: string;
  bulle: string;
  scene: string;
}

export interface BandeDessineeDTO {
  id: string;
  semaineCle: string;
  dateDebut: string;
  dateFin: string;
  titre: string;
  resume: string | null;
  imageUrl: string | null;
  promptImage: string | null;
  cases: CaseBD[];
  modeleTexte: string | null;
  modeleImage: string | null;
  batchJobName: string | null;
  batchStatut: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceLayoutInfo {
  url: string;
  tailleOctets: number;
}

export interface InfosSemaine {
  semaineCle: string;
  numeroSemaine: number;
  annee: number;
  dateDebut: string;
  dateFin: string;
  libelle: string;
}
