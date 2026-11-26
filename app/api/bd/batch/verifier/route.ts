import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  serialiserBandeDessinee,
  verifierBatchsEnAttente,
} from "@/lib/bd-generateur";

export async function POST() {
  const { misesAJour, erreurs } = await verifierBatchsEnAttente();
  const bds = await prisma.bandeDessinee.findMany({
    orderBy: { dateDebut: "desc" },
  });

  return NextResponse.json({
    misesAJour,
    erreurs,
    bandesDessinees: bds.map(serialiserBandeDessinee),
  });
}
