"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Zone } from "@/types";

const schema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  type: z.enum(["potager", "verger", "massif", "serre", "pelouse"]),
  surface: z.string().optional(),
  exposition: z.enum(["nord", "sud", "est", "ouest", "mi-ombre"]).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  zone?: Zone;
  onSuccess: () => void;
  onCancel: () => void;
}

export function FormulaireZone({ zone, onSuccess, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: zone?.nom ?? "",
      type: zone?.type ?? "potager",
      surface: zone?.surface?.toString() ?? "",
      exposition: zone?.exposition ?? undefined,
    },
  });

  async function onSubmit(data: FormValues) {
    const body = {
      nom: data.nom,
      type: data.type,
      surface: data.surface ? parseFloat(data.surface) : null,
      exposition: data.exposition ?? null,
    };

    const url = zone ? `/api/jardin/zones/${zone.id}` : "/api/jardin/zones";
    const method = zone ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="nom">Nom</Label>
        <Input id="nom" {...register("nom")} placeholder="Mon potager" />
        {errors.nom && <p className="text-xs text-red-500">{errors.nom.message}</p>}
      </div>

      <div className="space-y-1">
        <Label>Type</Label>
        <Select
          defaultValue={zone?.type ?? "potager"}
          onValueChange={(v) => setValue("type", v as FormValues["type"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["potager", "verger", "massif", "serre", "pelouse"].map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="surface">Surface (m²)</Label>
        <Input id="surface" type="number" step="0.1" {...register("surface")} placeholder="12" />
      </div>

      <div className="space-y-1">
        <Label>Exposition</Label>
        <Select
          defaultValue={zone?.exposition ?? ""}
          onValueChange={(v) => setValue("exposition", v as FormValues["exposition"])}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choisir..." />
          </SelectTrigger>
          <SelectContent>
            {["nord", "sud", "est", "ouest", "mi-ombre"].map((e) => (
              <SelectItem key={e} value={e}>
                {e.charAt(0).toUpperCase() + e.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-[#2d6a4f] hover:bg-[#40916c]">
          {isSubmitting ? "Enregistrement..." : zone ? "Modifier" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}
