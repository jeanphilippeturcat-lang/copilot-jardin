import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSemaineISO, serialiserInfosSemaine } from "@/lib/semaine";
import {
  getCastingAvecPortraits,
  serialiserBandeDessinee,
  verifierBatchsEnAttente,
} from "@/lib/bd-generateur";
import { getInfosImageReferenceLayout } from "@/lib/stockage";

export const dynamic = "force-dynamic";

export async function GET() {
  // Vérifie silencieusement si un job Batch en attente vient de se terminer
  await verifierBatchsEnAttente().catch(() => {});

  const [bds, casting, referenceLayout] = await Promise.all([
    prisma.bandeDessinee.findMany({
      orderBy: { dateDebut: "desc" },
    }),
    getCastingAvecPortraits(),
    getInfosImageReferenceLayout(),
  ]);

  const semaineCourante = serialiserInfosSemaine(getSemaineISO());

  return NextResponse.json({
    semaineCourante,
    bandesDessinees: bds.map(serialiserBandeDessinee),
    casting,
    referenceLayout,
  });
}
