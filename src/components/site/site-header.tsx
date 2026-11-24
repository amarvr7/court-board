import Link from "next/link";
import Image from "next/image";
import { existsSync } from "node:fs";
import path from "node:path";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_INFO } from "@/lib/event-config";
import { TennisBall } from "@/components/site/tennis-ball";

type ActivePage = "board" | "admin";

const hasLogoFile = (): boolean => {
  try {
    return existsSync(path.join(process.cwd(), "public", EVENT_INFO.logo.src));
  } catch {
    return false;
  }
};

export const SiteHeader = ({ active }: { active: ActivePage }) => {
  const showLogo = hasLogoFile();

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-navy text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-[13px] sm:px-6 lg:px-8">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ball opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ball" />
          </span>
          <span className="text-white/85">
            {EVENT_INFO.shortName} Ascender court board
          </span>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Board">
            {showLogo ? (
              <>
                <Image
                  src={EVENT_INFO.logo.src}
                  alt={EVENT_INFO.logo.alt}
                  width={856}
                  height={210}
                  priority
                  className="h-10 w-auto"
                />
                <span className="h-8 w-px bg-slate-200" aria-hidden="true" />
              </>
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy">
                <TennisBall className="h-6 w-6" />
              </span>
            )}
            <span className="leading-none">
              <span className="block font-display text-xl font-bold uppercase tracking-wide text-slate-900">
                {EVENT_INFO.shortName} Court Board
              </span>
              <span className="hidden text-xs text-slate-500 sm:block">
                Ascender team
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
            <Link
              href="/"
              aria-current={active === "board" ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-medium transition sm:px-4",
                active === "board"
                  ? "bg-mist text-brand"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              Board
            </Link>
            <Link
              href="/admin"
              aria-current={active === "admin" ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition sm:px-4",
                active === "admin"
                  ? "border-navy bg-navy text-white"
                  : "border-slate-300 bg-white text-slate-800 hover:border-slate-400"
              )}
            >
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Desk</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};
