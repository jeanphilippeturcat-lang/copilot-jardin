import { prisma } from "@/lib/prisma";
import { VueMensuelle } from "@/components/calendrier/VueMensuelle";
import { ProjetsPlantation } from "@/components/calendrier/ProjetsPlantation";

export const dynamic = "force-dynamic";

export default async function PageCalendrier() {
  const [taches, plantes, zones, intentions] = await Promise.all([
    prisma.tache.findMany({
      where: { dateEcheance: { not: null }, statut: { not: "ignoree" } },
      include: { plante: { select: { nom: true } } },
      orderBy: { dateEcheance: "asc" },
    }),
    prisma.plante.findMany({
      select: { id: true, nom: true, zone: { select: { nom: true } } },
      orderBy: { nom: "asc" },
    }),
    prisma.zone.findMany({
      select: { id: true, nom: true, type: true },
      orderBy: { nom: "asc" },
    }),
    prisma.intentionPlantation.findMany({
      where: { statut: { not: "annulee" } },
      include: {
        zone: { select: { nom: true } },
        taches: { orderBy: { dateEcheance: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const tachesSerialisees = taches.map((t) => ({
    ...t,
    dateEcheance: t.dateEcheance?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  const intentionsSerialisees = intentions.map((i) => ({
    ...i,
    datePlantation: i.datePlantation?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
    taches: i.taches.map((t) => ({
      ...t,
      dateEcheance: t.dateEcheance?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  }));

  return (
    <div className="min-h-screen bg-[#fefae0] pb-20 md:pb-6">
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-[#2d6a4f]">Calendrier</h1>
        <VueMensuelle taches={tachesSerialisees} plantes={plantes} zones={zones} />
        <ProjetsPlantation intentions={intentionsSerialisees} />
      </div>
    </div>
  );
}
