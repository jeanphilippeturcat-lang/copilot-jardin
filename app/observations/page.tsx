import { prisma } from "@/lib/prisma";
import { ObservationsClient } from "./ObservationsClient";

export const dynamic = "force-dynamic";

export default async function PageObservations() {
  const [observations, plantes] = await Promise.all([
    prisma.observation.findMany({
      include: {
        plante: { select: { id: true, nom: true, zone: { select: { nom: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plante.findMany({
      select: { id: true, nom: true, zone: { select: { nom: true } } },
      orderBy: { nom: "asc" },
    }),
  ]);

  const obsSerialisees = observations.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-[#fefae0] pb-20">
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-[#2d6a4f]">Observations</h1>
        <ObservationsClient observations={obsSerialisees} plantes={plantes} />
      </div>
    </div>
  );
}
