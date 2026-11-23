export type TypeZone = "potager" | "verger" | "massif" | "serre" | "pelouse";
export type TypePlante = "légume" | "arbre" | "arbuste" | "fleur" | "aromatique";
export type Exposition = "nord" | "sud" | "est" | "ouest" | "mi-ombre";
export type StatutTache = "a_faire" | "faite" | "ignoree";
export type TypeTache = "arrosage" | "taille" | "semis" | "traitement" | "récolte" | "autre";

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
