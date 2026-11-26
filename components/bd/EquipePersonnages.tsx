"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PersonnageBDAvecPortrait } from "@/types";

interface Props {
  casting: PersonnageBDAvecPortrait[];
}

export function EquipePersonnages({ casting }: Props) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <Card className="border-gray-200/80 bg-white">
      <CardContent className="pt-4">
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          className="flex w-full min-h-[44px] items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#2d6a4f]" />
            <div>
              <p className="text-sm font-semibold text-gray-800">
                L&apos;équipe méditerranéenne du jardin
              </p>
              <p className="text-xs text-gray-500">
                Animaux du Sud de la France : chacun gère toujours la même opération
              </p>
            </div>
          </div>
          {ouvert ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          )}
        </button>

        {ouvert && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {casting.map((perso) => (
              <div
                key={perso.id}
                className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/70 p-3"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                  {perso.portraitUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={perso.portraitUrl}
                      alt={`Fiche référence ${perso.nom}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="px-1 text-center text-[10px] leading-tight text-gray-400">
                      Fiche à créer
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold text-gray-800">{perso.nom}</p>
                    <Badge
                      variant="secondary"
                      className="bg-[#2d6a4f]/10 text-[#2d6a4f] text-[10px]"
                    >
                      {perso.roleLabel}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-600">
                    {perso.descriptionFr}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
