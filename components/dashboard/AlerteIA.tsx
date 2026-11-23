import { AlertTriangle, Info, XCircle } from "lucide-react";

interface Alerte {
  message: string;
  niveau: "info" | "warning" | "danger";
}

const config = {
  info: {
    bg: "bg-blue-50 border-blue-200",
    texte: "text-blue-700",
    Icon: Info,
  },
  warning: {
    bg: "bg-yellow-50 border-yellow-200",
    texte: "text-yellow-800",
    Icon: AlertTriangle,
  },
  danger: {
    bg: "bg-red-50 border-red-200",
    texte: "text-red-700",
    Icon: XCircle,
  },
};

export function AlerteIA({ alertes }: { alertes: Alerte[] }) {
  if (!alertes.length) return null;

  return (
    <div className="space-y-2">
      {alertes.map((a, i) => {
        const { bg, texte, Icon } = config[a.niveau] ?? config.info;
        return (
          <div key={i} className={`flex items-start gap-2 rounded-lg border p-3 ${bg}`}>
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${texte}`} />
            <p className={`text-sm ${texte}`}>{a.message}</p>
          </div>
        );
      })}
    </div>
  );
}
