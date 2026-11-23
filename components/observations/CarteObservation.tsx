"use client";

import { useState } from "react";
import { Microscope, Loader2, Trash2, ChevronDown, ChevronUp, AlertTriangle, Info, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Observation {
  id: string;
  note: string;
  photoUrl: string | null;
  diagnostic: string | null;
  createdAt: string;
  plante: { id: string; nom: string; zone: { nom: string } | null };
}

interface DiagnosticParse {
  diagnostic: string;
  causes_probables: string[];
  traitements: string[];
  urgence: "faible" | "moyenne" | "haute";
}

function parseDiagnostic(raw: string | null): DiagnosticParse | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as DiagnosticParse; } catch { return null; }
}

const couleurUrgence: Record<string, string> = {
  faible: "bg-green-100 text-green-700",
  moyenne: "bg-orange-100 text-orange-700",
  haute: "bg-red-100 text-red-700",
};

const iconeUrgence = { faible: Info, moyenne: AlertTriangle, haute: Zap };

interface Props {
  observation: Observation;
  onSuppression: (id: string) => void;
  onDiagnosticMaj: (obs: Observation) => void;
}

export function CarteObservation({ observation, onSuppression, onDiagnosticMaj }: Props) {
  const [diagnostic, setDiagnostic] = useState<DiagnosticParse | null>(
    parseDiagnostic(observation.diagnostic)
  );
  const [diagnosticOuvert, setDiagnosticOuvert] = useState(false);
  const [analyse, setAnalyse] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const date = new Date(observation.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  async function lancerDiagnostic() {
    setAnalyse(true);
    setErreur(null);
    try {
      const res = await fetch("/api/ia/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observationId: observation.id }),
      });
      if (!res.ok) throw new Error("Erreur lors de l'analyse");
      const data = await res.json() as Observation & { diagnosticParse: DiagnosticParse };
      setDiagnostic(data.diagnosticParse);
      setDiagnosticOuvert(true);
      onDiagnosticMaj({ ...observation, diagnostic: data.diagnostic });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setAnalyse(false);
    }
  }

  async function supprimer() {
    await fetch(`/api/observations/${observation.id}`, { method: "DELETE" });
    onSuppression(observation.id);
  }

  const UrgenceIcon = diagnostic ? iconeUrgence[diagnostic.urgence] : null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
      {observation.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={observation.photoUrl}
          alt={`Photo ${observation.plante.nom}`}
          className="w-full max-h-56 object-cover"
        />
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-gray-800">{observation.plante.nom}</p>
            {observation.plante.zone && (
              <p className="text-xs text-gray-400">{observation.plante.zone.nom} · {date}</p>
            )}
          </div>
          <button
            onClick={supprimer}
            className="shrink-0 text-gray-300 hover:text-red-400 transition-colors"
            aria-label="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-gray-600">{observation.note}</p>

        {/* Diagnostic existant */}
        {diagnostic && (
          <div className="space-y-2">
            <button
              onClick={() => setDiagnosticOuvert((o) => !o)}
              className="flex items-center gap-2 text-sm font-medium text-[#2d6a4f]"
            >
              {UrgenceIcon && <UrgenceIcon className="h-4 w-4" />}
              Diagnostic IA
              <Badge className={`text-xs ${couleurUrgence[diagnostic.urgence]}`} variant="secondary">
                {diagnostic.urgence}
              </Badge>
              {diagnosticOuvert ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
            </button>

            {diagnosticOuvert && (
              <div className="rounded-lg bg-gray-50 p-3 space-y-2 text-sm">
                <p className="text-gray-700">{diagnostic.diagnostic}</p>
                {diagnostic.causes_probables.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Causes probables</p>
                    <ul className="space-y-0.5">
                      {diagnostic.causes_probables.map((c, i) => (
                        <li key={i} className="text-gray-600 text-xs">· {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diagnostic.traitements.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Traitements</p>
                    <ul className="space-y-0.5">
                      {diagnostic.traitements.map((t, i) => (
                        <li key={i} className="text-gray-600 text-xs">· {t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bouton analyser */}
        {observation.photoUrl && !diagnostic && (
          <div className="space-y-1">
            <Button
              size="sm"
              variant="outline"
              onClick={lancerDiagnostic}
              disabled={analyse}
              className="w-full border-[#2d6a4f] text-[#2d6a4f] hover:bg-[#2d6a4f]/5"
            >
              {analyse ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyse en cours…</>
              ) : (
                <><Microscope className="mr-2 h-4 w-4" />Analyser avec l'IA</>
              )}
            </Button>
            {erreur && <p className="text-xs text-red-600">{erreur}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
