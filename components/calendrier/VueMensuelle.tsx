"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Plus, Sprout, CalendarPlus } from "lucide-react";
import { DialogIntention } from "./DialogIntention";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Tache {
  id: string;
  titre: string;
  type: string;
  statut: string;
  dateEcheance: string | null;
  description?: string | null;
  plante?: { nom: string } | null;
}

interface Plante {
  id: string;
  nom: string;
  zone?: { nom: string } | null;
}

interface Zone {
  id: string;
  nom: string;
  type: string;
}

interface IntentionRetour {
  id: string;
  nomPlante: string;
  periodeOptimale: string | null;
  datePlantation: string | null;
  raisonnement: string | null;
  taches: Tache[];
}

const TYPES_TACHE = [
  { value: "semis", label: "Semis" },
  { value: "plantation", label: "Plantation" },
  { value: "préparation sol", label: "Préparation sol" },
  { value: "arrosage", label: "Arrosage" },
  { value: "taille", label: "Taille" },
  { value: "traitement", label: "Traitement" },
  { value: "récolte", label: "Récolte" },
  { value: "autre", label: "Autre" },
];

const couleurType: Record<string, string> = {
  arrosage: "bg-blue-400",
  taille: "bg-orange-400",
  semis: "bg-green-400",
  plantation: "bg-emerald-500",
  "préparation sol": "bg-amber-700",
  traitement: "bg-red-400",
  récolte: "bg-yellow-400",
  autre: "bg-gray-400",
};

const couleurBadge: Record<string, string> = {
  arrosage: "bg-blue-100 text-blue-700",
  taille: "bg-orange-100 text-orange-700",
  semis: "bg-green-100 text-green-700",
  plantation: "bg-emerald-100 text-emerald-700",
  "préparation sol": "bg-amber-100 text-amber-800",
  traitement: "bg-red-100 text-red-700",
  récolte: "bg-yellow-100 text-yellow-700",
  autre: "bg-gray-100 text-gray-700",
};

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

function cle(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function labelDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function VueMensuelle({
  taches: tachesInitiales,
  plantes,
  zones,
}: {
  taches: Tache[];
  plantes: Plante[];
  zones: Zone[];
}) {
  const aujourd = new Date();
  const [moisCourant, setMoisCourant] = useState(
    new Date(aujourd.getFullYear(), aujourd.getMonth(), 1)
  );
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(cle(aujourd));
  const [statutsLocaux, setStatutsLocaux] = useState<Record<string, string>>({});
  const [taches, setTaches] = useState<Tache[]>(tachesInitiales);

  // Dialog intention plantation
  const [intentionOuverte, setIntentionOuverte] = useState(false);

  function onIntentionCreee(intention: IntentionRetour) {
    // Ajoute les tâches de la nouvelle intention dans le calendrier local
    setTaches((prev) => [...prev, ...intention.taches]);
  }

  // Formulaire tâche manuelle
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [formTitre, setFormTitre] = useState("");
  const [formType, setFormType] = useState("plantation");
  const [formPlanteId, setFormPlanteId] = useState<string>("__aucune__");
  const [formDescription, setFormDescription] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  // Grille
  const annee = moisCourant.getFullYear();
  const mois = moisCourant.getMonth();
  const premierJour = new Date(annee, mois, 1);
  const dernierJour = new Date(annee, mois + 1, 0);
  const decalage = (premierJour.getDay() + 6) % 7;
  const nbCases = decalage + dernierJour.getDate();
  const nbSemaines = Math.ceil(nbCases / 7);

  // Index tâches par date
  const tachesParJour = new Map<string, Tache[]>();
  for (const t of taches) {
    if (!t.dateEcheance) continue;
    const k = t.dateEcheance.slice(0, 10);
    if (!tachesParJour.has(k)) tachesParJour.set(k, []);
    tachesParJour.get(k)!.push(t);
  }

  function ouvrirFormulaire() {
    setFormTitre("");
    setFormType("plantation");
    setFormPlanteId("__aucune__");
    setFormDescription("");
    setDialogOuvert(true);
  }

  async function creerTache() {
    if (!formTitre.trim() || !jourSelectionne) return;
    setEnregistrement(true);
    try {
      const res = await fetch("/api/taches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: formTitre.trim(),
          type: formType,
          description: formDescription.trim() || null,
          planteId: formPlanteId === "__aucune__" ? null : formPlanteId,
          dateEcheance: jourSelectionne,
          source: "manuelle",
        }),
      });
      const nouvelle = await res.json() as Tache;
      // Ajoute la plante en local pour l'affichage immédiat
      const plante = plantes.find((p) => p.id === formPlanteId);
      setTaches((prev) => [...prev, { ...nouvelle, plante: plante ?? null }]);
      setDialogOuvert(false);
    } finally {
      setEnregistrement(false);
    }
  }

  async function basculerStatut(id: string, statutActuel: string) {
    const nouveau = statutActuel === "faite" ? "a_faire" : "faite";
    setStatutsLocaux((prev) => ({ ...prev, [id]: nouveau }));
    await fetch(`/api/taches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: nouveau }),
    });
  }

  async function reporterTache(id: string, dateCourante: string) {
    const base = new Date(dateCourante + "T12:00:00");
    base.setDate(base.getDate() + 1);
    await fetch(`/api/taches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateEcheance: base.toISOString() }),
    });
    setTaches((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, dateEcheance: base.toISOString() } : t
      )
    );
  }

  const tachesJourSelectionne = jourSelectionne
    ? (tachesParJour.get(jourSelectionne) ?? [])
    : [];

  const labelMois = moisCourant.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Navigation mois */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => { setMoisCourant(new Date(annee, mois - 1, 1)); setJourSelectionne(null); }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-base font-semibold capitalize text-[#2d6a4f]">{labelMois}</h2>
        <Button variant="ghost" size="icon" onClick={() => { setMoisCourant(new Date(annee, mois + 1, 1)); setJourSelectionne(null); }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grille */}
      <div className="rounded-xl border border-[#40916c]/20 bg-white overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {JOURS.map((j, i) => (
            <div key={i} className="py-2 text-center text-xs font-medium text-gray-400">{j}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: nbSemaines * 7 }).map((_, i) => {
            const numeroJour = i - decalage + 1;
            const estDansMois = numeroJour >= 1 && numeroJour <= dernierJour.getDate();
            if (!estDansMois) return <div key={i} className="h-12 border-b border-r border-gray-50 last:border-r-0" />;

            const dateCase = new Date(annee, mois, numeroJour);
            const k = cle(dateCase);
            const estAujourd = k === cle(aujourd);
            const estSelectionne = k === jourSelectionne;
            const tachesCase = tachesParJour.get(k) ?? [];
            const typesPastilles = [...new Set(tachesCase.map((t) => t.type))].slice(0, 3);

            return (
              <button
                key={i}
                onClick={() => setJourSelectionne(estSelectionne ? null : k)}
                className={`h-12 flex flex-col items-center justify-start pt-1.5 gap-0.5 border-b border-r border-gray-100 last:border-r-0 transition-colors ${
                  estSelectionne ? "bg-[#2d6a4f] text-white" : estAujourd ? "bg-[#40916c]/10" : "hover:bg-gray-50"
                }`}
              >
                <span className={`text-xs font-medium leading-none ${estSelectionne ? "text-white" : estAujourd ? "text-[#2d6a4f] font-bold" : "text-gray-700"}`}>
                  {numeroJour}
                </span>
                <div className="flex gap-0.5">
                  {typesPastilles.map((type) => (
                    <span key={type} className={`h-1.5 w-1.5 rounded-full ${couleurType[type] ?? "bg-gray-400"} ${estSelectionne ? "opacity-80" : ""}`} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(couleurType).map(([type, bg]) => (
          <div key={type} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${bg}`} />
            <span className="text-xs text-gray-400 capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Détail jour sélectionné */}
      {jourSelectionne && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium capitalize text-gray-600 min-w-0 truncate">{labelDate(jourSelectionne)}</h3>
            <div className="flex gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIntentionOuverte(true)}
                className="h-8 px-2.5 border-[#2d6a4f] text-[#2d6a4f] hover:bg-[#2d6a4f]/5"
              >
                <Sprout className="h-3.5 w-3.5 mr-1" />
                Plantation
              </Button>
              <Button
                size="sm"
                onClick={ouvrirFormulaire}
                className="bg-[#2d6a4f] hover:bg-[#40916c] text-white h-8 px-2.5"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tâche
              </Button>
            </div>
          </div>

          {tachesJourSelectionne.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune tâche ce jour.</p>
          ) : (
            tachesJourSelectionne.map((t) => {
              const statut = statutsLocaux[t.id] ?? t.statut;
              return (
                <div
                  key={t.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${statut === "faite" ? "border-green-100 bg-green-50" : "border-gray-100 bg-white"}`}
                >
                  <button onClick={() => basculerStatut(t.id, statut)} className="mt-0.5 shrink-0 text-[#40916c]">
                    {statut === "faite" ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${statut === "faite" ? "text-gray-400 line-through" : "text-gray-800"}`}>
                      {t.titre}
                    </p>
                    {t.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
                    )}
                    {t.plante && (
                      <p className="text-xs text-gray-400 mt-0.5">{t.plante.nom}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge className={`text-xs ${couleurBadge[t.type] ?? couleurBadge.autre}`} variant="secondary">
                      {t.type}
                    </Badge>
                    {statut !== "faite" && jourSelectionne && (
                      <button
                        onClick={() => reporterTache(t.id, jourSelectionne)}
                        className="text-gray-300 hover:text-blue-400 transition-colors"
                        aria-label="Reporter au lendemain"
                        title="Reporter au lendemain"
                      >
                        <CalendarPlus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Dialog formulaire */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#2d6a4f]">
              Planifier — {jourSelectionne ? labelDate(jourSelectionne) : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="titre">Tâche *</Label>
              <Input
                id="titre"
                placeholder="Ex : Semis de courgettes, Butter les pommes de terre…"
                value={formTitre}
                onChange={(e) => setFormTitre(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <Select value={formType} onValueChange={(v) => { if (v) setFormType(v); }}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_TACHE.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plante">Plante concernée</Label>
              <Select value={formPlanteId} onValueChange={(v) => { if (v) setFormPlanteId(v); }}>
                <SelectTrigger id="plante">
                  <span className={formPlanteId === "__aucune__" ? "text-muted-foreground" : ""}>
                    {formPlanteId === "__aucune__"
                      ? "Tout le jardin"
                      : plantes.find((p) => p.id === formPlanteId)?.nom ?? "Tout le jardin"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__aucune__">Tout le jardin</SelectItem>
                  {plantes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span>{p.nom}</span>
                      {p.zone && (
                        <span className="ml-2 text-xs text-gray-400">{p.zone.nom}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Notes / astuces</Label>
              <Textarea
                id="description"
                placeholder="Ex : Amender le sol avec du compost 2 semaines avant…"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOuvert(false)}>Annuler</Button>
            <Button
              onClick={creerTache}
              disabled={!formTitre.trim() || enregistrement}
              className="bg-[#2d6a4f] hover:bg-[#40916c] text-white"
            >
              {enregistrement ? "Enregistrement…" : "Planifier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DialogIntention
        ouvert={intentionOuverte}
        onFermer={() => setIntentionOuverte(false)}
        zones={zones}
        onCreee={onIntentionCreee}
      />
    </div>
  );
}
