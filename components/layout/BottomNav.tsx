"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sprout, CalendarDays, Camera, BookOpen } from "lucide-react";

const liens = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jardin", label: "Jardin", icon: Sprout },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/observations", label: "Observations", icon: Camera },
  { href: "/bd", label: "BD", icon: BookOpen },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white">
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-around px-2">
        {liens.map(({ href, label, icon: Icon }) => {
          const actif = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-[44px] flex-col items-center gap-1 px-2 py-2 text-xs transition-colors ${
                actif ? "text-[#2d6a4f]" : "text-gray-400 hover:text-[#40916c]"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={actif ? 2.5 : 1.5} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
