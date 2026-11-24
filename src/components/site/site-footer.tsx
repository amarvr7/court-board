import { EVENT_INFO } from "@/lib/event-config";
import { TennisBall } from "@/components/site/tennis-ball";

export const SiteFooter = () => (
  <footer className="mt-auto bg-navy text-white">
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold sm:text-4xl">
        Questions? We&apos;re here to help.
      </h2>
      <p className="mt-3 max-w-xl text-base text-white/85">
        Court assignments can change through the day. If something looks off,
        check in with the Ascender desk on site.
      </p>
      <a
        href="#top"
        className="mt-6 inline-flex rounded-full border border-white/35 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
      >
        Back to top ↑
      </a>
    </div>
    <div className="border-t border-white/10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-slate-400 sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-2">
          <TennisBall className="h-4 w-4" />
          ©{new Date().getFullYear()} {EVENT_INFO.name}
        </span>
        <span>{EVENT_INFO.location}</span>
      </div>
    </div>
  </footer>
);
