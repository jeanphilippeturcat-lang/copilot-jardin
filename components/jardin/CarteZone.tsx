"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Leaf, Clock } from "lucide-react";
import { FormulaireZone } from "./FormulaireZone";
import { FormulairePlante } from "./FormulairePlante";
import type { Zone, Plante } from "@/types";

interface Props {
  zone: Zone & { plantes: Plante[] };
}

function DerniereObservation({ date }: { date: string | null }) {
  if (!date) {
    return (
      <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
        <Clock className="h-3 w-3" />
        Aucune observation
      </p>
    );
  }

  const jours = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  const label = jours === 0 ? "aujourd'hui" : jours === 1 ? "hier" : `il y a ${jours} j`;
  const ancienne = jours > 30;

  return (
    <p className={`flex items-center gap-1 text-xs mt-0.5 ${ancienne ? "text-orange-500" : "text-gray-400"}`}>
      <Clock className="h-3 w-3" />
      Obs. {label}
    </p>
  );
}

const emojisType: Record<string, string> = {
  potager: "🥕",
  verger: "🍎",
  massif: "🌸",
  serre: "🏡",
  pelouse: "🌿",
};

export function CarteZone({ zone }: Props) {
  const router = useRouter();
  const [dialogZone, setDialogZone] = useState(false);
  const [dialogPlante, setDialogPlante] = useState(false);

  async function supprimerZone() {
    if (!confirm(`Supprimer la zone "${zone.nom}" et toutes ses plantes ?`)) return;
    await fetch(`/api/jardin/zones/${zone.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function supprimerPlante(plante: Plante) {
    if (!confirm(`Supprimer "${plante.nom}" ?`)) return;
    await fetch(`/api/jardin/plantes/${plante.id}`, { method: "DELETE" });
    router.refresh();
  }

  function onSuccess() {
    setDialogZone(false);
    setDialogPlante(false);
    router.refresh();
  }

  return (
    <>
      <Card className="border-l-4 border-l-[#2d6a4f]">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-semibold">
                {emojisType[zone.type]} {zone.nom}
              </CardTitle>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant="secondary">{zone.type}</Badge>
                {zone.surface && <Badge variant="outline">{zone.surface} m²</Badge>}
                {zone.exposition && <Badge variant="outline">{zone.exposition}</Badge>}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={() => setDialogZone(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-600" onClick={supprimerZone}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {zone.plantes.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune plante pour l&apos;instant</p>
          ) : (
            <ul className="space-y-1">
              {zone.plantes.map((plante) => (
                <li key={plante.id} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Leaf className="h-4 w-4 text-[#40916c] shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{plante.nom}</span>
                        {plante.nomLatine && (
                          <span className="text-xs italic text-gray-400 hidden sm:inline">{plante.nomLatine}</span>
                        )}
                        <Badge variant="outline" className="text-xs">{plante.type}</Badge>
                      </div>
                      <DerniereObservation date={plante.derniereObservation ?? null} />
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-400 hover:text-red-600 shrink-0"
                    onClick={() => supprimerPlante(plante)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <Button
            size="sm"
            variant="outline"
            className="w-full border-dashed text-[#2d6a4f]"
            onClick={() => setDialogPlante(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Ajouter une plante
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogZone} onOpenChange={setDialogZone}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la zone</DialogTitle>
          </DialogHeader>
          <FormulaireZone zone={zone} onSuccess={onSuccess} onCancel={() => setDialogZone(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogPlante} onOpenChange={setDialogPlante}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une plante</DialogTitle>
          </DialogHeader>
          <FormulairePlante zoneId={zone.id} onSuccess={onSuccess} onCancel={() => setDialogPlante(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
