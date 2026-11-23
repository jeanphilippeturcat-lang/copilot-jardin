"use client";

import { useState } from "react";
import { FormulaireObservation } from "@/components/observations/FormulaireObservation";
import { CarteObservation } from "@/components/observations/CarteObservation";

interface Plante {
  id: string;
  nom: string;
  zone: { nom: string } | null;
}

interface Observation {
  id: string;
  note: string;
  photoUrl: string | null;
  diagnostic: string | null;
  createdAt: string;
  plante: { id: string; nom: string; zone: { nom: string } | null };
}

interface Props {
  observations: Observation[];
  plantes: Plante[];
}

export function ObservationsClient({ observations: initiales, plantes }: Props) {
  const [observations, setObservations] = useState<Observation[]>(initiales);

  function onAjout(obs: Observation) {
    setObservations((prev) => [obs, ...prev]);
  }

  function onSuppression(id: string) {
    setObservations((prev) => prev.filter((o) => o.id !== id));
  }

  function onDiagnosticMaj(obs: Observation) {
    setObservations((prev) => prev.map((o) => (o.id === obs.id ? obs : o)));
  }

  return (
    <div className="space-y-6">
      {plantes.length === 0 ? (
        <p className="text-sm text-gray-500">Ajoute d'abord des plantes dans ton jardin.</p>
      ) : (
        <FormulaireObservation plantes={plantes} onAjout={onAjout} />
      )}

      {observations.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Aucune observation pour l'instant.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{observations.length} observation{observations.length > 1 ? "s" : ""}</p>
          {observations.map((obs) => (
            <CarteObservation
              key={obs.id}
              observation={obs}
              onSuppression={onSuppression}
              onDiagnosticMaj={onDiagnosticMaj}
            />
          ))}
        </div>
      )}
    </div>
  );
}
