"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { BandeDessineeDTO } from "@/types";

interface Props {
  bd: BandeDessineeDTO;
  ouvertParDefaut: boolean;
  onPromptMaj: (bdMaj: BandeDessineeDTO) => void;
}

export function PromptRecommande({ bd, ouvertParDefaut, onPromptMaj }: Props) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const [copie, setCopie] = useState(false);
  const [edition, setEdition] = useState(false);
  const [brouillon, setBrouillon] = useState(bd.promptImage ?? "");
  const [sauvegarde, setSauvegarde] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const promptActuel = bd.promptImage ?? "";

  async function copierPrompt() {
    if (!promptActuel) return;
    try {
      await navigator.clipboard.writeText(promptActuel);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      // Fallback si clipboard API indisponible sur HTTP non-localhost
      const textarea = document.createElement("textarea");
      textarea.value = promptActuel;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    }
  }

  async function enregistrerPrompt() {
    if (!brouillon.trim()) return;
    setSauvegarde(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/bd/${bd.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptImage: brouillon }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Erreur lors de l'enregistrement du prompt");
      }
      const data = (await res.json()) as { bd: BandeDessineeDTO };
      onPromptMaj(data.bd);
      setEdition(false);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSauvegarde(false);
    }
  }

  if (!promptActuel) return null;

  return (
    <Card className="border-[#2d6a4f]/25 bg-white">
      <CardContent className="pt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setOuvert((v) => !v)}
            className="flex min-h-[44px] flex-1 items-center gap-2 text-left"
          >
            <FileText className="h-4 w-4 shrink-0 text-[#2d6a4f]" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">
                Prompt &amp; données pour générer l&apos;image
              </p>
              <p className="text-xs text-gray-500">
                Format « The Garden Chronicle » (16:9 N&amp;B e-ink, maquette variée) + données du
                jardin incluses
              </p>
            </div>
            {ouvert ? (
              <ChevronUp className="ml-auto h-4 w-4 shrink-0 text-gray-400" />
            ) : (
              <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-gray-400" />
            )}
          </button>

          <Button
            type="button"
            size="sm"
            onClick={copierPrompt}
            className="min-h-[38px] bg-[#2d6a4f] text-white hover:bg-[#40916c]"
          >
            {copie ? (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                Copié !
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-4 w-4" />
                Copier le prompt
              </>
            )}
          </Button>
        </div>

        {ouvert && (
          <div className="space-y-3">
            <p className="rounded-lg bg-[#fefae0]/80 px-3 py-2 text-xs text-gray-600">
              Ce bloc inclut le prompt « The Garden Chronicle » <strong>et toutes les données
              réelles de la semaine</strong> (météo, zones/plantes, tâches, intentions,
              interventions et casting méditerranéen) pour générer ou ajuster facilement
              l&apos;image dans <strong>Gemini</strong>.
            </p>

            {edition ? (
              <div className="space-y-2">
                <Textarea
                  value={brouillon}
                  onChange={(e) => setBrouillon(e.target.value)}
                  rows={14}
                  className="font-mono text-xs leading-relaxed bg-gray-50"
                />
                {erreur && <p className="text-xs text-red-600">{erreur}</p>}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setBrouillon(promptActuel);
                      setEdition(false);
                      setErreur(null);
                    }}
                    disabled={sauvegarde}
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={enregistrerPrompt}
                    disabled={sauvegarde}
                    className="bg-[#2d6a4f] text-white hover:bg-[#40916c]"
                  >
                    <Save className="mr-1 h-3.5 w-3.5" />
                    {sauvegarde ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-relaxed text-gray-800 select-all">
                  {promptActuel}
                </pre>
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEdition(true)}
                    className="text-xs text-gray-600 hover:text-[#2d6a4f]"
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Personnaliser ce prompt
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
