import type { InfosSemaine } from "@/types";

export interface SemaineDates {
  semaineCle: string;
  numeroSemaine: number;
  annee: number;
  dateDebut: Date;
  dateFin: Date;
  libelle: string;
}

/**
 * Calcule les informations de la semaine ISO 8601 (lundi 00:00 → dimanche 23:59:59.999)
 * pour une date donnée (en temps local du serveur).
 */
export function getSemaineISO(reference: Date = new Date()): SemaineDates {
  const dateDebut = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
    0,
    0,
    0,
    0
  );

  // Décalage pour revenir au lundi (lundi = 0, dimanche = 6)
  const jourSemaine = (dateDebut.getDay() + 6) % 7;
  dateDebut.setDate(dateDebut.getDate() - jourSemaine);

  const dateFin = new Date(dateDebut);
  dateFin.setDate(dateDebut.getDate() + 6);
  dateFin.setHours(23, 59, 59, 999);

  // Calcul du numéro de semaine ISO 8601 (basé sur le jeudi de la semaine)
  const jeudi = new Date(Date.UTC(dateDebut.getFullYear(), dateDebut.getMonth(), dateDebut.getDate() + 3));
  const annee = jeudi.getUTCFullYear();
  const premierJanvier = new Date(Date.UTC(annee, 0, 1));
  const diffJours = Math.floor((jeudi.getTime() - premierJanvier.getTime()) / 86_400_000);
  const numeroSemaine = Math.floor(diffJours / 7) + 1;

  const semaineCle = `${annee}-W${String(numeroSemaine).padStart(2, "0")}`;

  return {
    semaineCle,
    numeroSemaine,
    annee,
    dateDebut,
    dateFin,
    libelle: formaterLibelleSemaine(numeroSemaine, dateDebut, dateFin),
  };
}

export function formaterLibelleSemaine(
  numeroSemaine: number,
  dateDebut: Date,
  dateFin: Date
): string {
  const debutStr = dateDebut.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
  const finStr = dateFin.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `Semaine ${numeroSemaine} · ${debutStr} – ${finStr}`;
}

export function serialiserInfosSemaine(semaine: SemaineDates): InfosSemaine {
  return {
    semaineCle: semaine.semaineCle,
    numeroSemaine: semaine.numeroSemaine,
    annee: semaine.annee,
    dateDebut: semaine.dateDebut.toISOString(),
    dateFin: semaine.dateFin.toISOString(),
    libelle: semaine.libelle,
  };
}

export function extraireNumeroSemaine(semaineCle: string): number {
  const match = /-W(\d{2})$/.exec(semaineCle);
  return match ? Number(match[1]) : 1;
}
