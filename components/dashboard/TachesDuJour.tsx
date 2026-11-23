"use client";

import { useState } from "react";
import { CheckCircle2, Circle, MinusCircle, CalendarPlus, Sprout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Tache {
  id: string;
  titre: string;
  type: string;
  statut: string;
  planteId: string | null;
  plante?: { nom: string } | null;
}

const couleurType: Record<string, string> = {
  arrosage: "bg-blue-100 text-blue-700",
  taille: "bg-orange-100 text-orange-700",
  semis: "bg-green-100 text-green-700",
  traitement: "bg-red-100 text-red-700",
  récolte: "bg-yellow-100 text-yellow-700",
  autre: "bg-gray-100 text-gray-700",
};

async function majStatut(id: string, statut: string) {
  await fetch(`/api/taches/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statut }),
  });
}

async function reporter(id: string) {
  const demain = new Date();
  demain.setDate(demain.getDate() + 1);
  demain.setHours(12, 0, 0, 0);
  await fetch(`/api/taches/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dateEcheance: demain.toISOString() }),
  });
}

export function TachesDuJour({ tachesInitiales }: { tachesInitiales: Tache[] }) {
  const [taches, setTaches] = useState(tachesInitiales);

  async function basculerStatut(id: string, statutActuel: string) {
    const nouveau = statutActuel === "faite" ? "a_faire" : "faite";
    await majStatut(id, nouveau);
    setTaches((prev) => prev.map((t) => (t.id === id ? { ...t, statut: nouveau } : t)));
  }

  async function ignorerTache(id: string) {
    await majStatut(id, "ignoree");
    setTaches((prev) => prev.filter((t) => t.id !== id));
  }

  async function reporterTache(id: string) {
    await reporter(id);
    setTaches((prev) => prev.filter((t) => t.id !== id));
  }

  const visibles = taches.filter((t) => t.statut !== "ignoree");

  if (!visibles.length) {
    return (
      <Card className="border-[#40916c]/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#2d6a4f]">Tâches du jour</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">Aucune tâche pour aujourd'hui.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#40916c]/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base text-[#2d6a4f]">
          <span>Tâches du jour</span>
          <span className="text-xs font-normal text-gray-400">
            {taches.filter((t) => t.statut === "faite").length}/{visibles.length + taches.filter((t) => t.statut === "faite").length} faites
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {visibles.map((t) => (
          <div key={t.id} className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${t.statut === "faite" ? "bg-green-50" : "bg-white"} border border-gray-100`}>
            <button
              onClick={() => basculerStatut(t.id, t.statut)}
              className="mt-0.5 shrink-0 text-[#40916c] transition-opacity hover:opacity-70"
              aria-label={t.statut === "faite" ? "Marquer non faite" : "Marquer faite"}
            >
              {t.statut === "faite" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${t.statut === "faite" ? "text-gray-400 line-through" : "text-gray-800"}`}>
                {t.titre}
              </p>
              {t.plante && (
                <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                  <Sprout className="h-3 w-3" />
                  {t.plante.nom}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge className={`text-xs ${couleurType[t.type] ?? couleurType.autre}`} variant="secondary">
                {t.type}
              </Badge>
              <button
                onClick={() => reporterTache(t.id)}
                className="text-gray-300 hover:text-blue-400 transition-colors"
                aria-label="Reporter à demain"
                title="Reporter à demain"
              >
                <CalendarPlus className="h-4 w-4" />
              </button>
              <button
                onClick={() => ignorerTache(t.id)}
                className="text-gray-300 hover:text-gray-500 transition-colors"
                aria-label="Ignorer définitivement"
                title="Ignorer définitivement"
              >
                <MinusCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
