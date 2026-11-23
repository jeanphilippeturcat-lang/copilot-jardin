import { NextResponse } from "next/server";
import { getMeteo } from "@/lib/meteo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ville = searchParams.get("ville") ?? "Montpellier,fr";

  try {
    const previsions = await getMeteo(ville);
    return NextResponse.json(previsions);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur météo";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
