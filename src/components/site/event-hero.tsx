import React from "react";
import { CalendarDays, MapPin, LayoutGrid } from "lucide-react";
import { EVENT_INFO } from "@/lib/event-config";
import { CourtLines } from "@/components/site/tennis-ball";

interface EventHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  compact?: boolean;
}

const InfoChip = ({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm text-white ring-1 ring-white/15">
    {icon}
    {children}
  </span>
);

export const EventHero = ({
  eyebrow = "Tennis",
  title,
  subtitle,
  children,
  compact = false,
}: EventHeroProps) => (
  <section className="relative overflow-hidden bg-navy text-white">
    <div className="absolute inset-0 bg-gradient-to-br from-[#0e1622] via-navy to-[#0d1327]" />
    <CourtLines className="pointer-events-none absolute -right-24 top-1/2 h-[140%] w-auto -translate-y-1/2 text-white/[0.07]" />
    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand via-brand to-ball" />

    <div
      className={
        compact
          ? "relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
          : "relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
      }
    >
      <p className="text-sm text-white/60">
        Events <span className="px-1">/</span>
        <span className="text-sky-link">{eyebrow}</span>
      </p>

      <h1
        className={
          compact
            ? "mt-3 max-w-3xl text-4xl font-bold sm:text-5xl"
            : "mt-3 max-w-3xl text-5xl font-bold sm:text-7xl"
        }
      >
        {title}
      </h1>

      {subtitle && (
        <p className="mt-3 max-w-2xl text-base text-white/80 sm:text-lg">
          {subtitle}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <InfoChip icon={<CalendarDays className="h-4 w-4 text-sky-link" />}>
          {EVENT_INFO.dates}
        </InfoChip>
        <InfoChip icon={<MapPin className="h-4 w-4 text-sky-link" />}>
          {EVENT_INFO.location}
        </InfoChip>
        <InfoChip icon={<LayoutGrid className="h-4 w-4 text-sky-link" />}>
          {EVENT_INFO.totalCourts} courts
        </InfoChip>
      </div>

      {children && <div className="mt-7 flex flex-wrap gap-3">{children}</div>}
    </div>
  </section>
);
