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
import type { Plante } from "@/types";

const schema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  nomLatine: z.string().optional(),
  type: z.enum(["légume", "arbre", "arbuste", "fleur", "aromatique"]),
  datePlantee: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  zoneId: string;
  plante?: Plante;
  onSuccess: () => void;
  onCancel: () => void;
}

export function FormulairePlante({ zoneId, plante, onSuccess, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: plante?.nom ?? "",
      nomLatine: plante?.nomLatine ?? "",
      type: plante?.type ?? "légume",
      datePlantee: plante?.datePlantee
        ? new Date(plante.datePlantee).toISOString().split("T")[0]
        : "",
    },
  });

  async function onSubmit(data: FormValues) {
    const body = {
      nom: data.nom,
      nomLatine: data.nomLatine || null,
      type: data.type,
      datePlantee: data.datePlantee || null,
      zoneId,
    };

    const url = plante ? `/api/jardin/plantes/${plante.id}` : "/api/jardin/plantes";
    const method = plante ? "PUT" : "POST";

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
        <Input id="nom" {...register("nom")} placeholder="Tomate cerise" />
        {errors.nom && <p className="text-xs text-red-500">{errors.nom.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="nomLatine">Nom latin (optionnel)</Label>
        <Input id="nomLatine" {...register("nomLatine")} placeholder="Solanum lycopersicum" />
      </div>

      <div className="space-y-1">
        <Label>Type</Label>
        <Select
          defaultValue={plante?.type ?? "légume"}
          onValueChange={(v) => setValue("type", v as FormValues["type"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["légume", "arbre", "arbuste", "fleur", "aromatique"].map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="datePlantee">Date de plantation</Label>
        <Input id="datePlantee" type="date" {...register("datePlantee")} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-[#2d6a4f] hover:bg-[#40916c]">
          {isSubmitting ? "Enregistrement..." : plante ? "Modifier" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}
