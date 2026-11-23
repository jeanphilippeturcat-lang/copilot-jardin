"use client";

import { useState } from "react";
import { Sprout, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Zone {
  id: string;
  nom: string;
  type: string;
}

interface TacheRetour {
  id: string;
  titre: string;
  type: string;
  dateEcheance: string | null;
  description: string | null;
  statut: string;
}

interface IntentionRetour {
  id: string;
  nomPlante: string;
  periodeOptimale: string | null;
  datePlantation: string | null;
  raisonnement: string | null;
  taches: TacheRetour[];
}

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  zones: Zone[];
  onCreee: (intention: IntentionRetour) => void;
}

export function DialogIntention({ ouvert, onFermer, zones, onCreee }: Props) {
  const [nomPlante, setNomPlante] = useState("");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<IntentionRetour | null>(null);

  function reinitialiser() {
    setNomPlante("");
    setZoneId(zones[0]?.id ?? "");
    setNotes("");
    setErreur(null);
    setResultat(null);
  }

  function fermer() {
    reinitialiser();
    onFermer();
  }

  async function soumettre() {
    if (!nomPlante.trim() || !zoneId) return;
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch("/api/ia/planifier-plantation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomPlante, zoneId, notes: notes || undefined }),
      });
      if (!res.ok) throw new Error("Erreur lors de la planification");
      const data = await res.json() as IntentionRetour;
      setResultat(data);
      onCreee(data);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setChargement(false);
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={(o) => { if (!o) fermer(); }}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#2d6a4f]">
            <Sprout className="h-5 w-5" />
            Nouvelle plantation
          </DialogTitle>
        </DialogHeader>

        {!resultat ? (
          <>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="nomPlante">Plante à installer *</Label>
                <Input
                  id="nomPlante"
                  placeholder="Ex : Vigne, Rosier, Courgettes…"
                  value={nomPlante}
                  onChange={(e) => setNomPlante(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="zone-intention">Zone de destination *</Label>
                <Select value={zoneId} onValueChange={(v) => { if (v) setZoneId(v); }}>
                  <SelectTrigger id="zone-intention">
                    <span>{zones.find((z) => z.id === zoneId)?.nom ?? "Choisir une zone"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        <span>{z.nom}</span>
                        <span className="ml-2 text-xs text-gray-400">{z.type}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes-intention">Contexte <span className="text-gray-400 text-xs">(optionnel)</span></Label>
                <Textarea
                  id="notes-intention"
                  placeholder="Ex : sol argileux, exposition plein sud, à côté du mur en pierre…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {erreur && (
                <p className="text-sm text-red-600">{erreur}</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={fermer} disabled={chargement}>Annuler</Button>
              <Button
                onClick={soumettre}
                disabled={!nomPlante.trim() || !zoneId || chargement}
                className="bg-[#2d6a4f] hover:bg-[#40916c] text-white"
              >
                {chargement ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    L'IA planifie…
                  </>
                ) : (
                  "Planifier avec l'IA"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Résultat de l'IA
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-[#2d6a4f]/5 border border-[#40916c]/20 p-3 space-y-2">
              <p className="text-sm font-medium text-[#2d6a4f]">
                Période optimale : {resultat.periodeOptimale}
              </p>
              <p className="text-sm text-gray-600">{resultat.raisonnement}</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {resultat.taches.length} étapes planifiées dans le calendrier
              </p>
              {resultat.taches.map((t) => (
                <div key={t.id} className="flex items-start gap-2 rounded-md border border-gray-100 bg-white px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{t.titre}</p>
                    {t.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
                    )}
                  </div>
                  {t.dateEcheance && (
                    <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                      {new Date(t.dateEcheance).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <Button onClick={fermer} className="w-full bg-[#2d6a4f] hover:bg-[#40916c] text-white">
              Voir dans le calendrier
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
