"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sprout, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Tache {
  id: string;
  titre: string;
  type: string;
  statut: string;
  dateEcheance: string | null;
  description: string | null;
}

interface Intention {
  id: string;
  nomPlante: string;
  periodeOptimale: string | null;
  datePlantation: string | null;
  raisonnement: string | null;
  statut: string;
  zone: { nom: string };
  taches: Tache[];
}

async function majStatutTache(id: string, statut: string) {
  await fetch(`/api/taches/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statut }),
  });
}

function CarteIntention({ intention }: { intention: Intention }) {
  const [ouverte, setOuverte] = useState(false);
  const [statutsLocaux, setStatutsLocaux] = useState<Record<string, string>>({});

  const taches = intention.taches;
  const nbFaites = taches.filter(
    (t) => (statutsLocaux[t.id] ?? t.statut) === "faite"
  ).length;
  const pct = taches.length > 0 ? Math.round((nbFaites / taches.length) * 100) : 0;

  async function basculer(id: string, actuel: string) {
    const nouveau = actuel === "faite" ? "a_faire" : "faite";
    setStatutsLocaux((prev) => ({ ...prev, [id]: nouveau }));
    await majStatutTache(id, nouveau);
  }

  const datePlantation = intention.datePlantation
    ? new Date(intention.datePlantation).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="rounded-xl border border-[#40916c]/20 bg-white overflow-hidden">
      <button
        onClick={() => setOuverte((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2d6a4f]/10">
          <Sprout className="h-4 w-4 text-[#2d6a4f]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800">{intention.nomPlante}</p>
          <p className="text-xs text-gray-400">{intention.zone.nom} · {intention.periodeOptimale ?? datePlantation}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-xs font-medium text-[#2d6a4f]">{pct}%</p>
            <p className="text-xs text-gray-400">{nbFaites}/{taches.length}</p>
          </div>
          {ouverte ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Barre de progression */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-1 bg-[#40916c] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {ouverte && (
        <div className="divide-y divide-gray-50">
          {intention.raisonnement && (
            <p className="px-4 py-3 text-xs text-gray-500 italic">{intention.raisonnement}</p>
          )}
          {taches.map((t) => {
            const statut = statutsLocaux[t.id] ?? t.statut;
            const date = t.dateEcheance
              ? new Date(t.dateEcheance).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
              : null;
            return (
              <div key={t.id} className={`flex items-start gap-3 px-4 py-3 transition-colors ${statut === "faite" ? "bg-green-50/50" : ""}`}>
                <button onClick={() => basculer(t.id, statut)} className="mt-0.5 shrink-0 text-[#40916c]">
                  {statut === "faite" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${statut === "faite" ? "line-through text-gray-400" : "text-gray-800"}`}>
                    {t.titre}
                  </p>
                  {t.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {date && <span className="text-xs text-gray-400">{date}</span>}
                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">{t.type}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProjetsPlantation({ intentions }: { intentions: Intention[] }) {
  if (!intentions.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        Projets de plantation ({intentions.length})
      </h3>
      {intentions.map((i) => (
        <CarteIntention key={i.id} intention={i} />
      ))}
    </div>
  );
}
