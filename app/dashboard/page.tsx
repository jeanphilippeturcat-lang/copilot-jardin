import { getMeteo } from "@/lib/meteo";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./DashboardClient";

export default async function PageDashboard() {
  const finJournee = new Date();
  finJournee.setHours(23, 59, 59, 999);

  const [previsions, taches] = await Promise.all([
    getMeteo().catch(() => []),
    prisma.tache.findMany({
      where: {
        statut: "a_faire",
        OR: [
          { dateEcheance: null },
          { dateEcheance: { lte: finJournee } },
        ],
      },
      include: { plante: { select: { nom: true } } },
      orderBy: [{ dateEcheance: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return <DashboardClient previsions={previsions} tachesInitiales={taches} />;
}
