"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CarteZone } from "@/components/jardin/CarteZone";
import { FormulaireZone } from "@/components/jardin/FormulaireZone";
import { Plus } from "lucide-react";
import type { Zone, Plante } from "@/types";

export default function PageJardin() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: zones, mutate } = useSWR<(Zone & { plantes: Plante[] })[]>(
    "/api/jardin/zones"
  );

  function onSuccess() {
    setDialogOpen(false);
    mutate();
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#fefae0] pb-20 md:pb-6">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2d6a4f]">Mon Jardin</h1>
            <p className="text-sm text-gray-500">
              {zones ? `${zones.length} zone${zones.length > 1 ? "s" : ""}` : "Chargement..."}
            </p>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-[#2d6a4f] hover:bg-[#40916c]"
          >
            <Plus className="mr-1 h-4 w-4" />
            Nouvelle zone
          </Button>
        </div>

        {!zones ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : zones.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400">Aucune zone pour l&apos;instant.</p>
            <p className="mt-1 text-sm text-gray-400">
              Commencez par créer votre première zone.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {zones.map((zone) => (
              <CarteZone key={zone.id} zone={zone} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle zone</DialogTitle>
          </DialogHeader>
          <FormulaireZone onSuccess={onSuccess} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
