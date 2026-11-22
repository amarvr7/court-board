import Link from "next/link";
import { ArrowRight, Lock, Shield, Search, RefreshCw, FileSpreadsheet } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { EventHero } from "@/components/site/event-hero";
import { SiteFooter } from "@/components/site/site-footer";
import { EVENT_INFO } from "@/lib/event-config";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "courts", label: "Courts" },
  { id: "how-it-works", label: "How it works" },
  { id: "staff", label: "Tournament desk" },
];

export default function HomePage() {
  return (
    <div id="top" className="flex min-h-screen flex-col">
      <SiteHeader active="home" />

      <EventHero
        title="Live court board"
        subtitle="Find your court, see who's on, and follow every assignment across the facility in real time."
      >
        <Link
          href="/board"
          className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-base font-medium text-white transition hover:bg-brand-dark"
        >
          Open live board
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-full border border-white/35 px-6 py-3 text-base font-medium text-white transition hover:bg-white/10"
        >
          <Shield className="h-4 w-4" />
          Staff sign-in
        </Link>
      </EventHero>

      {/* Status strip */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-4 sm:px-6 lg:px-8">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-ball ring-4 ring-ball/25" />
          <span className="font-bold text-slate-900">Play is underway.</span>
          <span className="text-[15px] text-slate-500">
            Check the live board for court assignments. Courts can change through the day.
          </span>
        </div>
      </div>

      {/* Section nav */}
      <nav
        aria-label="Page sections"
        className="sticky top-[106px] z-30 border-b border-slate-200 bg-white/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 sm:px-6 lg:px-8">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="whitespace-nowrap border-b-2 border-transparent py-3.5 text-sm font-medium text-slate-500 transition hover:border-brand hover:text-slate-900"
            >
              {section.label}
            </a>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
        {/* Overview */}
        <section id="overview" className="scroll-mt-40">
          <h2 className="text-4xl font-bold text-brand sm:text-5xl">About the board</h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-500">
            The {EVENT_INFO.shortName} court board shows every match assignment across all{" "}
            {EVENT_INFO.totalCourts} courts. Players, parents, and coaches can search a name and
            jump straight to the right court. Player names display as first name and last initial.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-mist px-4 py-2 text-sm text-slate-600">
            <Lock className="h-4 w-4 text-brand" />
            Board access requires the event PIN, posted at the tournament desk.
          </div>
        </section>

        {/* Courts */}
        <section id="courts" className="scroll-mt-40">
          <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">Courts</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-[15px]">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Area</th>
                  <th className="px-5 py-3 font-semibold">Courts</th>
                  <th className="hidden px-5 py-3 font-semibold sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {EVENT_INFO.zones.map((zone) => (
                  <tr key={zone.name}>
                    <td className="px-5 py-4 font-semibold text-slate-900">{zone.name}</td>
                    <td className="px-5 py-4">
                      <span className="inline-block rounded-full bg-chip px-3 py-1 text-sm text-slate-500">
                        {zone.courts}
                      </span>
                    </td>
                    <td className="hidden px-5 py-4 text-slate-500 sm:table-cell">{zone.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-40">
          <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">How it works</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                icon: <Lock className="h-5 w-5" />,
                title: "Enter the event PIN",
                body: "Get the 4-digit PIN from the tournament desk to unlock the board on your phone.",
              },
              {
                icon: <Search className="h-5 w-5" />,
                title: "Search your player",
                body: "Type a name to highlight their court and jump right to it.",
              },
              {
                icon: <RefreshCw className="h-5 w-5" />,
                title: "Stay updated",
                body: "The board refreshes automatically every 20 seconds.",
              },
            ].map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mist text-brand">
                    {step.icon}
                  </span>
                  <span className="font-display text-4xl font-bold text-slate-200">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-500">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Staff */}
        <section
          id="staff"
          className="scroll-mt-40 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"
        >
          <span className="inline-block rounded-full bg-ice px-3 py-1 text-[13px] text-slate-500">
            Staff only
          </span>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Tournament desk</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500">
            Update court status, assign players, and bulk-upload the order of play from a CSV.
            Password required.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-base font-medium text-white transition hover:bg-slate-800"
            >
              <Shield className="h-4 w-4" />
              Open admin
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm text-slate-600">
              <FileSpreadsheet className="h-4 w-4 text-brand" />
              CSV bulk upload
            </span>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
