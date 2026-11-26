import { NextResponse } from "next/server";
import {
  genererOuRecupererBDSemaine,
  type ModeGenerationBD,
} from "@/lib/bd-generateur";
import { getSemaineISO, serialiserInfosSemaine } from "@/lib/semaine";

export const maxDuration = 120;

const MODES_VALIDES: readonly ModeGenerationBD[] = [
  "prompt",
  "batch",
  "image",
  "complet",
];

export async function POST(request: Request) {
  let force = false;
  let mode: ModeGenerationBD = "prompt";

  try {
    const body = (await request.json()) as {
      force?: boolean;
      mode?: string;
    } | null;
    force = Boolean(body?.force);
    if (body?.mode && MODES_VALIDES.includes(body.mode as ModeGenerationBD)) {
      mode = body.mode as ModeGenerationBD;
    }
  } catch {
    // Corps vide accepté
  }

  try {
    const resultat = await genererOuRecupererBDSemaine({ force, mode });
    return NextResponse.json({
      ...resultat,
      semaineCourante: serialiserInfosSemaine(getSemaineISO()),
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Erreur lors de la génération de la chronique de la semaine";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
