"use client";

import { Cloud, Droplets, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PrevisionMeteo } from "@/lib/meteo";

function nomJour(dateStr: string) {
  const date = new Date(dateStr + "T12:00:00");
  const aujourd = new Date();
  const demain = new Date();
  demain.setDate(demain.getDate() + 1);

  if (date.toDateString() === aujourd.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === demain.toDateString()) return "Demain";
  return date.toLocaleDateString("fr-FR", { weekday: "long" });
}

export function MeteoWidget({ previsions }: { previsions: PrevisionMeteo[] }) {
  if (!previsions.length) {
    return (
      <Card className="border-[#40916c]/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#2d6a4f]">Météo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">Météo indisponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#40916c]/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-[#2d6a4f]">
          <Cloud className="h-4 w-4" />
          Météo — 3 jours
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {previsions.map((j) => (
            <div key={j.date} className="flex flex-col items-center gap-1 rounded-lg bg-[#2d6a4f]/5 p-2 text-center">
              <span className="text-xs font-medium capitalize text-[#2d6a4f]">{nomJour(j.date)}</span>
              <span className="text-xs capitalize text-gray-500">{j.description}</span>
              <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                <Thermometer className="h-3 w-3 text-orange-400" />
                {Math.round(j.tempMin)}°–{Math.round(j.tempMax)}°
              </div>
              {j.pluie > 0 && (
                <div className="flex items-center gap-1 text-xs text-blue-500">
                  <Droplets className="h-3 w-3" />
                  {j.pluie.toFixed(1)}mm
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
