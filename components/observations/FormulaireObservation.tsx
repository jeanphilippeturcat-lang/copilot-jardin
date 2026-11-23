"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

interface Plante {
  id: string;
  nom: string;
  zone: { nom: string } | null;
}

interface ObservationRetour {
  id: string;
  planteId: string;
  note: string;
  photoUrl: string | null;
  diagnostic: string | null;
  createdAt: string;
  plante: { id: string; nom: string; zone: { nom: string } | null };
}

interface Props {
  plantes: Plante[];
  onAjout: (obs: ObservationRetour) => void;
}

export function FormulaireObservation({ plantes, onAjout }: Props) {
  const [planteId, setPlanteId] = useState(plantes[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [apercu, setApercu] = useState<string | null>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function selectionnerFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFichier(f);
    setApercu(URL.createObjectURL(f));
  }

  function supprimerPhoto() {
    setFichier(null);
    setApercu(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!planteId || (!note.trim() && !fichier)) return;
    setEnvoi(true);
    setErreur(null);

    try {
      let photoUrl: string | undefined;

      if (fichier) {
        const fd = new FormData();
        fd.append("photo", fichier);
        const resPhoto = await fetch("/api/photos", { method: "POST", body: fd });
        if (!resPhoto.ok) throw new Error("Échec de l'upload photo");
        const data = await resPhoto.json() as { url: string };
        photoUrl = data.url;
      }

      const resObs = await fetch("/api/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planteId, note: note.trim(), photoUrl }),
      });
      if (!resObs.ok) throw new Error("Échec de l'enregistrement");
      const nouvelle = await resObs.json() as ObservationRetour;

      onAjout(nouvelle);
      setNote("");
      supprimerPhoto();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={soumettre} className="rounded-xl border border-[#40916c]/20 bg-white p-4 space-y-4">
      <h2 className="font-semibold text-[#2d6a4f]">Nouvelle observation</h2>

      <div className="space-y-1.5">
        <Label>Plante *</Label>
        <Select value={planteId} onValueChange={(v) => { if (v) setPlanteId(v); }}>
          <SelectTrigger>
            <span>{plantes.find((p) => p.id === planteId)?.nom ?? "Choisir"}</span>
          </SelectTrigger>
          <SelectContent>
            {plantes.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span>{p.nom}</span>
                {p.zone && <span className="ml-2 text-xs text-gray-400">{p.zone.nom}</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">
          Note{" "}
          <span className="text-gray-400 text-xs">{fichier ? "(optionnel)" : "*"}</span>
        </Label>
        <Textarea
          id="note"
          placeholder="Que remarques-tu ? (feuilles jaunies, nouvelles pousses, arrosage fait…)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Photo <span className="text-gray-400 text-xs">(optionnel)</span></Label>
        {apercu ? (
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={apercu} alt="aperçu" className="w-full max-h-48 object-cover rounded-lg" />
            <button
              type="button"
              onClick={supprimerPhoto}
              className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-6 text-sm text-gray-400 hover:border-[#40916c]/40 hover:text-[#40916c] transition-colors"
          >
            <Camera className="h-5 w-5" />
            Ajouter une photo
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={selectionnerFichier}
          className="hidden"
        />
      </div>

      {erreur && <p className="text-sm text-red-600">{erreur}</p>}

      <Button
        type="submit"
        disabled={!planteId || (!note.trim() && !fichier) || envoi}
        className="w-full bg-[#2d6a4f] hover:bg-[#40916c] text-white"
      >
        {envoi ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</> : "Enregistrer"}
      </Button>
    </form>
  );
}
