"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookmarkCheck,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ImagePlus,
  Layers,
  Loader2,
  Maximize2,
  Newspaper,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EquipePersonnages } from "@/components/bd/EquipePersonnages";
import { PromptRecommande } from "@/components/bd/PromptRecommande";
import type {
  BandeDessineeDTO,
  InfosSemaine,
  OperationBD,
  PersonnageBDAvecPortrait,
  ReferenceLayoutInfo,
} from "@/types";

interface Props {
  semaineCourante: InfosSemaine;
  bandesDessineesInitiales: BandeDessineeDTO[];
  castingInitial: PersonnageBDAvecPortrait[];
  referenceLayoutInitiale: ReferenceLayoutInfo | null;
  modeleTexteDefaut: string;
  modeleImageDefaut: string;
}

const LIBELLE_OPERATION: Record<OperationBD, string> = {
  plantation: "Plantation & sol",
  arrosage: "Arrosage",
  taille: "Taille",
  traitement: "Soin & traitement",
  recolte: "Récolte",
  desherbage: "Désherbage",
  meteo: "Prévisions météo",
  entretien: "Entretien",
};

const ETATS_BATCH_EN_COURS = new Set([
  "JOB_STATE_UNSPECIFIED",
  "JOB_STATE_QUEUED",
  "JOB_STATE_PENDING",
  "JOB_STATE_RUNNING",
]);

function formaterPlageSemaine(
  dateDebutIso: string,
  dateFinIso: string,
  semaineCle: string
): string {
  const match = /-W(\d{2})$/.exec(semaineCle);
  const num = match ? Number(match[1]) : null;
  const debut = new Date(dateDebutIso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
  const fin = new Date(dateFinIso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
  return num ? `S${num} · ${debut} – ${fin}` : `${debut} – ${fin}`;
}

function formaterKo(octets: number): string {
  return `${Math.max(1, Math.round(octets / 1024))} Ko`;
}

function formaterDateHeure(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function BdClient({
  semaineCourante,
  bandesDessineesInitiales,
  castingInitial,
  referenceLayoutInitiale,
  modeleTexteDefaut,
  modeleImageDefaut,
}: Props) {
  const [bds, setBds] = useState<BandeDessineeDTO[]>(bandesDessineesInitiales);
  const [casting, setCasting] = useState<PersonnageBDAvecPortrait[]>(castingInitial);
  const [referenceLayout, setReferenceLayout] = useState<ReferenceLayoutInfo | null>(
    referenceLayoutInitiale
  );
  const [semaineSelectionnee, setSemaineSelectionnee] = useState<string>(
    semaineCourante.semaineCle
  );
  const [generationEnCours, setGenerationEnCours] = useState(false);
  const [importEnCours, setImportEnCours] = useState(false);
  const [verifBatchEnCours, setVerifBatchEnCours] = useState(false);
  const [majRefEnCours, setMajRefEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [infoImage, setInfoImage] = useState<string | null>(null);
  const [zoomOuvert, setZoomOuvert] = useState(false);
  const autoDeclencheRef = useRef(false);
  const inputFichierRef = useRef<HTMLInputElement | null>(null);
  const inputRefLayoutRef = useRef<HTMLInputElement | null>(null);

  const bdSemaineCourante = bds.find(
    (b) => b.semaineCle === semaineCourante.semaineCle
  );
  const bdAffichee =
    bds.find((b) => b.semaineCle === semaineSelectionnee) ??
    bdSemaineCourante ??
    bds[0] ??
    null;

  const batchEnAttente =
    Boolean(bdAffichee?.batchJobName) &&
    Boolean(bdAffichee?.batchStatut) &&
    ETATS_BATCH_EN_COURS.has(bdAffichee?.batchStatut ?? "");

  function mettreAJourBD(bdMaj: BandeDessineeDTO) {
    setBds((prev) => {
      const sansAncienne = prev.filter((b) => b.semaineCle !== bdMaj.semaineCle);
      return [bdMaj, ...sansAncienne].sort(
        (a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime()
      );
    });
  }

  async function lancerGeneration(
    force: boolean,
    mode: "prompt" | "batch" | "image" | "complet" = "prompt"
  ) {
    setGenerationEnCours(true);
    setErreur(null);
    setInfoImage(null);
    try {
      const res = await fetch("/api/bd/generer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force, mode }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(
          errData?.error || "Erreur lors de la génération de la chronique de la semaine"
        );
      }

      const data = (await res.json()) as {
        bd: BandeDessineeDTO;
        imageErreur?: string | null;
        casting?: PersonnageBDAvecPortrait[];
        referenceLayout?: ReferenceLayoutInfo | null;
      };

      mettreAJourBD(data.bd);
      if (data.casting) setCasting(data.casting);
      if (data.referenceLayout !== undefined) setReferenceLayout(data.referenceLayout);
      if (data.imageErreur) {
        setInfoImage(data.imageErreur);
      } else if (mode === "batch" && data.bd.batchJobName) {
        setInfoImage(
          `Job Batch mis en file d'attente (${data.bd.modeleImage ?? modeleImageDefaut}). L'image sera récupérée automatiquement dès que Google aura terminé le traitement (-50%).`
        );
      }
      setSemaineSelectionnee(data.bd.semaineCle);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setGenerationEnCours(false);
    }
  }

  async function verifierBatch() {
    setVerifBatchEnCours(true);
    setErreur(null);
    setInfoImage(null);
    try {
      const res = await fetch("/api/bd/batch/verifier", { method: "POST" });
      if (!res.ok) throw new Error("Impossible de vérifier l'état du Batch");
      const data = (await res.json()) as {
        misesAJour: number;
        erreurs: string[];
        bandesDessinees: BandeDessineeDTO[];
      };
      setBds(data.bandesDessinees);
      if (data.erreurs.length > 0) {
        setInfoImage(data.erreurs.join(" · "));
      } else if (data.misesAJour > 0) {
        setInfoImage("✨ Nouvelle image reçue et mise à jour avec succès via le Batch Google !");
      } else {
        setInfoImage("Le job Batch est toujours en cours de traitement côté Google. Réessayez dans un instant.");
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setVerifBatchEnCours(false);
    }
  }

  async function importerImage(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier || !bdAffichee) return;

    setImportEnCours(true);
    setErreur(null);
    setInfoImage(null);
    try {
      const formData = new FormData();
      formData.append("image", fichier);

      const res = await fetch(`/api/bd/${bdAffichee.id}/image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errData?.error || "Erreur lors de l'import de l'image");
      }

      const data = (await res.json()) as { bd: BandeDessineeDTO };
      mettreAJourBD(data.bd);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setImportEnCours(false);
    }
  }

  async function definirEditionCommeReference(bdId: string) {
    setMajRefEnCours(true);
    setErreur(null);
    try {
      const res = await fetch("/api/bd/reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bdId }),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errData?.error || "Impossible de définir l'image de référence");
      }
      const data = (await res.json()) as { referenceLayout: ReferenceLayoutInfo | null };
      setReferenceLayout(data.referenceLayout);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setMajRefEnCours(false);
    }
  }

  async function importerReferenceLayout(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;

    setMajRefEnCours(true);
    setErreur(null);
    try {
      const formData = new FormData();
      formData.append("image", fichier);
      const res = await fetch("/api/bd/reference", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errData?.error || "Impossible d'importer l'image de référence");
      }
      const data = (await res.json()) as { referenceLayout: ReferenceLayoutInfo | null };
      setReferenceLayout(data.referenceLayout);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setMajRefEnCours(false);
    }
  }

  async function supprimerReferenceLayout() {
    setMajRefEnCours(true);
    setErreur(null);
    try {
      await fetch("/api/bd/reference", { method: "DELETE" });
      setReferenceLayout(null);
    } finally {
      setMajRefEnCours(false);
    }
  }

  // Prépare uniquement le prompt recommandé à la première visite d'une nouvelle semaine
  // (génération automatique d'image désactivée — l'image est gérée manuellement)
  useEffect(() => {
    if (bdSemaineCourante || autoDeclencheRef.current) return;
    autoDeclencheRef.current = true;
    void lancerGeneration(false, "prompt");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bdSemaineCourante]);

  // Vérification automatique périodique si un job Batch est en attente
  useEffect(() => {
    const aUnBatchEnAttente = bds.some(
      (b) =>
        Boolean(b.batchJobName) &&
        Boolean(b.batchStatut) &&
        ETATS_BATCH_EN_COURS.has(b.batchStatut ?? "")
    );
    if (!aUnBatchEnAttente) return;

    let actif = true;
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch("/api/bd/batch/verifier", { method: "POST" });
        if (!res.ok || !actif) return;
        const data = (await res.json()) as {
          misesAJour: number;
          erreurs: string[];
          bandesDessinees: BandeDessineeDTO[];
        };
        if (!actif) return;
        if (data.misesAJour > 0) {
          setBds(data.bandesDessinees);
          setInfoImage("✨ Nouvelle image reçue et mise à jour avec succès via le Batch Google !");
        } else if (data.bandesDessinees.length > 0) {
          setBds(data.bandesDessinees);
        }
      } catch {
        // Silencieux en tâche de fond
      }
    }, 6000);

    return () => {
      actif = false;
      clearInterval(intervalId);
    };
  }, [bds]);

  const estSemaineActuelle = bdAffichee?.semaineCle === semaineCourante.semaineCle;
  const infoModeles = `${bdAffichee?.modeleTexte ?? modeleTexteDefaut} + ${
    bdAffichee?.modeleImage ?? modeleImageDefaut
  }`;

  return (
    <div className="min-h-screen bg-[#fefae0] pb-24">
      <input
        ref={inputFichierRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={importerImage}
        className="hidden"
      />
      <input
        ref={inputRefLayoutRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={importerReferenceLayout}
        className="hidden"
      />

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#2d6a4f]">The Garden Chronicle</h1>
            <p className="mt-0.5 text-sm text-gray-500">{semaineCourante.libelle}</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    onClick={() => lancerGeneration(true, "prompt")}
                    disabled={generationEnCours}
                    size="sm"
                    className="min-h-[40px] bg-[#2d6a4f] text-white hover:bg-[#40916c]"
                  />
                }
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${generationEnCours ? "animate-spin" : ""}`}
                />
                {generationEnCours
                  ? "Rédaction…"
                  : bdSemaineCourante
                    ? "Régénérer le prompt"
                    : "Générer le prompt"}
              </TooltipTrigger>
              <TooltipContent>Modèles : {infoModeles}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Erreur bloquante */}
        {erreur && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-2">
            <p>{erreur}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => lancerGeneration(true, "prompt")}
              disabled={generationEnCours}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              Réessayer
            </Button>
          </div>
        )}

        {/* Info génération / Batch */}
        {infoImage && (
          <div
            className={`flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-xs ${
              infoImage.includes("✨") || infoImage.includes("succès")
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {infoImage.includes("✨") || infoImage.includes("succès") ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Clock className="h-4 w-4 shrink-0 text-amber-600" />
              )}
              <span>{infoImage}</span>
            </div>
            <button
              type="button"
              onClick={() => setInfoImage(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
              aria-label="Fermer la notification"
            >
              ×
            </button>
          </div>
        )}

        {/* État de chargement */}
        {generationEnCours && (
          <Card className="border-[#40916c]/30 bg-white">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2d6a4f]/10 text-[#2d6a4f]">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-[#2d6a4f]">
                  Préparation de la chronique de la semaine…
                </p>
                <p className="max-w-sm text-xs text-gray-500">
                  Sélection des 3 actions clés et rédaction du prompt « The Garden Chronicle »
                  (appel stateless avec {modeleImageDefaut}).
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Édition BD sélectionnée */}
        {bdAffichee && (
          <div className="space-y-4">
            <Card className="overflow-hidden border-2 border-gray-900/15 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-bold text-gray-900">
                      {bdAffichee.titre}
                    </h2>
                    {estSemaineActuelle ? (
                      <Badge className="bg-[#2d6a4f] text-white text-[11px]">
                        Cette semaine
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[11px]">
                        Archive
                      </Badge>
                    )}
                    {bdAffichee.imageUrl ? (
                      batchEnAttente ? (
                        <Badge className="border-amber-300 bg-amber-100 text-amber-900 text-[11px] font-medium animate-pulse">
                          <Clock className="mr-1 h-3 w-3 text-amber-700" />
                          Régénération Batch en cours
                        </Badge>
                      ) : (
                        <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px] font-medium">
                          <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />
                          Image à jour
                        </Badge>
                      )
                    ) : batchEnAttente ? (
                      <Badge className="border-amber-300 bg-amber-100 text-amber-900 text-[11px] font-medium animate-pulse">
                        <Clock className="mr-1 h-3 w-3 text-amber-700" />
                        Batch en cours
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-500">
                    {formaterPlageSemaine(
                      bdAffichee.dateDebut,
                      bdAffichee.dateFin,
                      bdAffichee.semaineCle
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => inputFichierRef.current?.click()}
                    disabled={importEnCours}
                    className="h-8 text-xs"
                  >
                    {importEnCours ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {bdAffichee.imageUrl ? "Remplacer" : "Importer"}
                  </Button>

                  {bdAffichee.imageUrl && (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="outline"
                                onClick={() => definirEditionCommeReference(bdAffichee.id)}
                                disabled={majRefEnCours}
                                aria-label="Définir comme image de référence"
                              />
                            }
                          >
                            <BookmarkCheck className="h-4 w-4 text-[#2d6a4f]" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Définir comme référence de style JPEG (trait &amp; personnages)
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        onClick={() => setZoomOuvert(true)}
                        aria-label="Agrandir la BD"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                      <a
                        href={bdAffichee.imageUrl}
                        download={`garden-chronicle-${bdAffichee.semaineCle}.png`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-gray-700 hover:bg-accent"
                        aria-label="Télécharger la BD"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Bandeau Batch en attente */}
              {batchEnAttente && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50/90 px-4 py-2.5 text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-600" />
                    <span>
                      Génération Batch en cours ({bdAffichee.batchStatut?.replace("JOB_STATE_", "") || "En attente"}) — actualisation automatique active dès réception (-50%).
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={verifierBatch}
                    disabled={verifBatchEnCours}
                    className="h-7 border-amber-300 bg-white text-xs text-amber-900 hover:bg-amber-100"
                  >
                    {verifBatchEnCours ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-3 w-3" />
                    )}
                    Vérifier le batch
                  </Button>
                </div>
              )}

              {/* Image de la une 16:9 OU zone d'attente + actions manuelles */}
              {bdAffichee.imageUrl ? (
                <div className="relative group bg-white p-2 sm:p-3">
                  <button
                    type="button"
                    onClick={() => setZoomOuvert(true)}
                    className="block w-full focus:outline-none"
                    aria-label="Afficher la BD en plein écran"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bdAffichee.imageUrl}
                      alt={`The Garden Chronicle : ${bdAffichee.titre}`}
                      className={`mx-auto w-full rounded-lg border bg-white object-contain transition-all ${
                        batchEnAttente
                          ? "border-amber-300 opacity-80 brightness-95"
                          : "border-gray-200"
                      }`}
                    />
                  </button>

                  {/* Indice visuel direct sur l'image */}
                  {batchEnAttente ? (
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 rounded-lg bg-amber-950/90 px-3 py-2 text-xs text-amber-100 backdrop-blur shadow-md border border-amber-500/40">
                      <div className="flex items-center gap-2 min-w-0">
                        <Loader2 className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">
                            Version précédente affichée
                          </p>
                          <p className="text-[11px] text-amber-200/90 truncate">
                            Nouvelle image en attente de réception (Batch -50%) · L&apos;image sera actualisée automatiquement
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-amber-500/25 text-amber-200 border-amber-400/30 text-[10px] shrink-0">
                        {bdAffichee.batchStatut?.replace("JOB_STATE_", "") || "En attente"}
                      </Badge>
                    </div>
                  ) : (
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-emerald-950/80 px-2.5 py-1 text-[11px] font-medium text-emerald-200 backdrop-blur shadow-sm border border-emerald-500/40">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Image à jour</span>
                      {bdAffichee.updatedAt && (
                        <span className="hidden sm:inline text-emerald-300/80 text-[10px]">
                          · {formaterDateHeure(bdAffichee.updatedAt)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : batchEnAttente ? (
                <div className="flex flex-col items-center justify-center gap-3 bg-[#faf8f0] px-4 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-amber-700">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                  <div className="max-w-md space-y-1">
                    <p className="text-sm font-semibold text-amber-950">
                      Génération Batch en cours…
                    </p>
                    <p className="text-xs text-amber-800/80">
                      Le job Batch (-50%) est en cours de traitement chez Google. L&apos;image apparaîtra
                      ici automatiquement dès réception (vérification toutes les 6 s).
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={verifierBatch}
                    disabled={verifBatchEnCours}
                    className="border-amber-300 bg-white text-xs text-amber-900 hover:bg-amber-100"
                  >
                    {verifBatchEnCours ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Vérifier maintenant
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 bg-[#faf8f0] px-4 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700">
                    <Newspaper className="h-6 w-6" />
                  </div>
                  <div className="max-w-md space-y-1">
                    <p className="text-sm font-semibold text-gray-800">
                      Prompt prêt ! Ajoute ou génère l&apos;image 16:9
                    </p>
                    <p className="text-xs text-gray-500">
                      Copie le prompt + données ci-dessous dans Gemini, ou lance un job
                      Batch (-50%) avec <strong>{modeleImageDefaut}</strong>.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => inputFichierRef.current?.click()}
                      disabled={importEnCours}
                      className="bg-[#2d6a4f] text-white hover:bg-[#40916c]"
                    >
                      {importEnCours ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="mr-1.5 h-4 w-4" />
                      )}
                      Importer l&apos;image
                    </Button>
                    {estSemaineActuelle && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => lancerGeneration(false, "batch")}
                          disabled={generationEnCours || batchEnAttente}
                          className="border-[#2d6a4f]/40 text-[#2d6a4f] hover:bg-[#2d6a4f]/5"
                        >
                          <Layers className="mr-1.5 h-4 w-4" />
                          Batch API (-50%)
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => lancerGeneration(false, "image")}
                          disabled={generationEnCours}
                        >
                          <Wand2 className="mr-1.5 h-4 w-4" />
                          Direct (1K)
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Actions et statut compacts sous l'image */}
              {bdAffichee.imageUrl && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-white px-4 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    {batchEnAttente ? (
                      <span className="flex items-center gap-1.5 font-medium text-amber-700">
                        <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        Régénération Batch en cours · Nouvelle image en attente
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        Image à jour {bdAffichee.updatedAt ? `· Reçue le ${formaterDateHeure(bdAffichee.updatedAt)}` : ""}
                        {bdAffichee.modeleImage && (
                          <span className="hidden sm:inline font-normal text-gray-500">
                            ({bdAffichee.modeleImage})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {estSemaineActuelle && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => lancerGeneration(false, "batch")}
                        disabled={generationEnCours || batchEnAttente}
                        className="h-7 text-xs border-[#2d6a4f]/40 text-[#2d6a4f]"
                      >
                        <Layers className="mr-1 h-3.5 w-3.5" />
                        Batch (-50%)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => lancerGeneration(false, "image")}
                        disabled={generationEnCours}
                        className="h-7 text-xs"
                      >
                        <Wand2 className="mr-1 h-3.5 w-3.5" />
                        Direct
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {bdAffichee.resume && (
                <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
                  <p className="text-sm text-gray-700">{bdAffichee.resume}</p>
                </div>
              )}
            </Card>

            {/* Recommandation de prompt + données du jardin */}
            <PromptRecommande
              key={`${bdAffichee.id}-${bdAffichee.updatedAt}`}
              bd={bdAffichee}
              ouvertParDefaut={!bdAffichee.imageUrl}
              onPromptMaj={mettreAJourBD}
            />

            {/* Actions clés illustrées */}
            {bdAffichee.cases.length > 0 && (
              <Card className="border-gray-200/80 bg-white">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#2d6a4f]" />
                    <h3 className="text-sm font-semibold text-gray-800">
                      Chronique des tâches clés ({bdAffichee.cases.length})
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {bdAffichee.cases.map((c) => (
                      <div
                        key={c.numero}
                        className="flex items-start gap-3 rounded-lg border border-gray-100 bg-[#fefae0]/40 p-3"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                          {c.numero}
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-medium text-gray-900">
                              {c.actionCle}
                            </p>
                            {c.planteOuZone && (
                              <Badge variant="outline" className="text-[11px] bg-white">
                                {c.planteOuZone}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span className="font-medium text-[#2d6a4f]">
                              {c.personnageNom}
                            </span>
                            <span>·</span>
                            <span>{LIBELLE_OPERATION[c.operation] ?? c.operation}</span>
                          </div>
                          {c.bulle && (
                            <p className="text-xs italic text-gray-600">« {c.bulle} »</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* État vide */}
        {!bdAffichee && !generationEnCours && !erreur && (
          <Card className="border-dashed border-gray-300 bg-white/80">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <BookOpen className="h-10 w-10 text-[#2d6a4f]/60" />
              <div className="space-y-1">
                <p className="font-semibold text-gray-800">
                  Aucune édition générée pour cette semaine
                </p>
                <p className="text-sm text-gray-500">
                  Clique sur Générer pour créer la chronique de la semaine et la
                  recommandation de prompt noir &amp; blanc.
                </p>
              </div>
              <Button
                onClick={() => lancerGeneration(false, "prompt")}
                className="bg-[#2d6a4f] text-white hover:bg-[#40916c]"
              >
                Générer le prompt de la semaine
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Référence de style optionnelle JPEG compressée (appel stateless) */}
        <Card className="border-gray-200/80 bg-white">
          <CardContent className="pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  Référence de style optionnelle (JPEG compressé)
                </p>
                <p className="text-xs text-gray-500">
                  Guide uniquement le trait noir &amp; blanc et les personnages · sans figer la
                  mise en page
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => inputRefLayoutRef.current?.click()}
                  disabled={majRefEnCours}
                  className="h-8 text-xs"
                >
                  {majRefEnCours ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {referenceLayout ? "Changer" : "Choisir"}
                </Button>
                {referenceLayout && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={supprimerReferenceLayout}
                    disabled={majRefEnCours}
                    aria-label="Supprimer l'image de référence"
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {referenceLayout ? (
              <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/70 p-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referenceLayout.url}
                  alt="Référence mise en page compressée"
                  className="h-14 w-24 shrink-0 rounded border border-gray-200 bg-white object-cover"
                />
                <div className="min-w-0 text-xs text-gray-600 space-y-0.5">
                  <p className="font-medium text-gray-800">
                    Référence active ({formaterKo(referenceLayout.tailleOctets)})
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Compressée automatiquement en JPEG ≤ 1024 px pour minimiser les
                    tokens d&apos;entrée.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Aucune référence fixée — chaque édition est générée librement en noir &amp; blanc
                haut contraste (e-ink) avec une maquette tirée au sort. Ajoute une image seulement
                si tu veux guider le trait ou les personnages.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Archives des semaines précédentes */}
        {bds.length > 1 && (
          <Card className="border-gray-200/80 bg-white">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#2d6a4f]" />
                  <h3 className="text-sm font-semibold text-gray-800">
                    Archives des semaines ({bds.length})
                  </h3>
                </div>
                {!estSemaineActuelle && bdSemaineCourante && (
                  <button
                    type="button"
                    onClick={() => setSemaineSelectionnee(semaineCourante.semaineCle)}
                    className="text-xs font-medium text-[#2d6a4f] hover:underline"
                  >
                    Revenir à cette semaine
                  </button>
                )}
              </div>

              <div className="flex gap-3 overflow-x-auto pb-1">
                {bds.map((item) => {
                  const actif = item.semaineCle === bdAffichee?.semaineCle;
                  const estActuelle = item.semaineCle === semaineCourante.semaineCle;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSemaineSelectionnee(item.semaineCle)}
                      className={`group flex w-36 shrink-0 flex-col overflow-hidden rounded-lg border text-left transition-all ${
                        actif
                          ? "border-[#2d6a4f] ring-2 ring-[#2d6a4f]/25 bg-[#2d6a4f]/5"
                          : "border-gray-200 bg-white hover:border-[#40916c]"
                      }`}
                    >
                      <div className="relative flex h-24 w-full items-center justify-center overflow-hidden border-b border-gray-100 bg-gray-50">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.titre}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Newspaper className="h-7 w-7 text-gray-300" />
                        )}
                        {estActuelle && (
                          <span className="absolute top-1.5 left-1.5 rounded bg-[#2d6a4f] px-1.5 py-0.5 text-[10px] font-medium text-white">
                            Actuelle
                          </span>
                        )}
                        {item.imageUrl && (
                          Boolean(item.batchJobName) &&
                          Boolean(item.batchStatut) &&
                          ETATS_BATCH_EN_COURS.has(item.batchStatut ?? "") ? (
                            <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded bg-amber-600/90 px-1.5 py-0.5 text-[9px] font-medium text-white shadow-xs">
                              <Clock className="h-2.5 w-2.5" /> Batch
                            </span>
                          ) : (
                            <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded bg-emerald-700/90 px-1.5 py-0.5 text-[9px] font-medium text-white shadow-xs">
                              <Check className="h-2.5 w-2.5" /> À jour
                            </span>
                          )
                        )}
                      </div>
                      <div className="p-2 space-y-0.5">
                        <p className="truncate text-xs font-semibold text-gray-800">
                          {item.titre}
                        </p>
                        <p className="truncate text-[11px] text-gray-500">
                          {formaterPlageSemaine(
                            item.dateDebut,
                            item.dateFin,
                            item.semaineCle
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Équipe méditerranéenne des personnages */}
        <EquipePersonnages casting={casting} />
      </div>

      {/* Visionneuse plein écran */}
      <Dialog open={zoomOuvert} onOpenChange={setZoomOuvert}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl bg-white">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
              <DialogTitle className="text-gray-900">
                {bdAffichee?.titre}
              </DialogTitle>
              {bdAffichee?.imageUrl && (
                batchEnAttente ? (
                  <Badge className="border-amber-300 bg-amber-100 text-amber-900 text-xs">
                    <Clock className="mr-1 h-3 w-3" />
                    Version précédente (Régénération en cours)
                  </Badge>
                ) : (
                  <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />
                    Image à jour
                  </Badge>
                )
              )}
            </div>
          </DialogHeader>
          {bdAffichee?.imageUrl && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bdAffichee.imageUrl}
                alt={`The Garden Chronicle : ${bdAffichee.titre}`}
                className={`w-full rounded-lg border bg-white object-contain ${
                  batchEnAttente ? "border-amber-300 opacity-90" : "border-gray-200"
                }`}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
