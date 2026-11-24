"use client";

import { useState } from "react";
import { RefreshCw, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MeteoWidget } from "@/components/dashboard/MeteoWidget";
import { TachesDuJour } from "@/components/dashboard/TachesDuJour";
import { AlerteIA } from "@/components/dashboard/AlerteIA";
import type { PrevisionMeteo } from "@/lib/meteo";

interface Tache {
  id: string;
  titre: string;
  type: string;
  statut: string;
  planteId: string | null;
  plante?: { nom: string } | null;
}

interface Alerte {
  message: string;
  niveau: "info" | "warning" | "danger";
}

interface Props {
  previsions: PrevisionMeteo[];
  tachesInitiales: Tache[];
  modeleIA: string;
}

export function DashboardClient({ previsions, tachesInitiales, modeleIA }: Props) {
  const [taches, setTaches] = useState<Tache[]>(tachesInitiales);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [conseil, setConseil] = useState<string | null>(null);
  const [modeleActif, setModeleActif] = useState<string>(modeleIA);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function actualiserIA() {
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch("/api/ia/recommandations", { method: "POST" });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Erreur lors de la génération des recommandations");
      }
      const data = await res.json();
      setTaches((prev) => [...data.taches, ...prev]);
      setAlertes(data.alertes ?? []);
      setConseil(data.conseil_du_jour ?? null);
      if (data.modele) setModeleActif(data.modele);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setChargement(false);
    }
  }

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen bg-[#fefae0] pb-20">
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {/* En-tête */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2d6a4f]">Tableau de bord</h1>
            <p className="mt-0.5 text-sm capitalize text-gray-500">{today}</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    onClick={actualiserIA}
                    disabled={chargement}
                    size="sm"
                    className="bg-[#2d6a4f] hover:bg-[#40916c] text-white"
                  />
                }
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${chargement ? "animate-spin" : ""}`} />
                {chargement ? "Génération…" : "Actualiser IA"}
              </TooltipTrigger>
              <TooltipContent>Modèle : {modeleActif}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {erreur && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erreur}
          </div>
        )}

        {/* Conseil du jour */}
        {conseil && (
          <Card className="border-[#40916c]/30 bg-[#40916c]/5">
            <CardContent className="flex items-start gap-3 pt-4">
              <Lightbulb className="h-5 w-5 shrink-0 text-[#2d6a4f] mt-0.5" />
              <p className="text-sm text-[#2d6a4f]">{conseil}</p>
            </CardContent>
          </Card>
        )}

        {/* Alertes IA */}
        <AlerteIA alertes={alertes} />

        {/* Météo */}
        <MeteoWidget previsions={previsions} />

        {/* Tâches */}
        <TachesDuJour tachesInitiales={taches} />

        {!conseil && !chargement && taches.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">
            Appuie sur <strong>Actualiser IA</strong> pour générer les recommandations du jour.
          </div>
        )}
      </div>
    </div>
  );
}
