import { prisma } from "@/lib/prisma";
import { GEMINI_IMAGE_MODEL, GEMINI_MODEL } from "@/lib/gemini";
import { getSemaineISO, serialiserInfosSemaine } from "@/lib/semaine";
import {
  getCastingAvecPortraits,
  serialiserBandeDessinee,
  verifierBatchsEnAttente,
} from "@/lib/bd-generateur";
import { getInfosImageReferenceLayout } from "@/lib/stockage";
import { BdClient } from "./BdClient";

export const dynamic = "force-dynamic";

export default async function PageBD() {
  // Vérifie silencieusement les jobs Batch en attente avant affichage
  await verifierBatchsEnAttente().catch(() => {});

  const [bds, casting, referenceLayout] = await Promise.all([
    prisma.bandeDessinee.findMany({
      orderBy: { dateDebut: "desc" },
    }),
    getCastingAvecPortraits(),
    getInfosImageReferenceLayout(),
  ]);

  const semaineCourante = serialiserInfosSemaine(getSemaineISO());

  return (
    <BdClient
      semaineCourante={semaineCourante}
      bandesDessineesInitiales={bds.map(serialiserBandeDessinee)}
      castingInitial={casting}
      referenceLayoutInitiale={referenceLayout}
      modeleTexteDefaut={GEMINI_MODEL}
      modeleImageDefaut={GEMINI_IMAGE_MODEL}
    />
  );
}
