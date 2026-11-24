"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, X, Clock, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BoardCourtDTO } from "@/lib/queries";
import {
  formatElapsedLabel,
  formatMovedTag,
} from "@/lib/match-text";

interface CourtBoardProps {
  initialCourts: BoardCourtDTO[];
  initialFetchedAt: string;
}

const POLL_INTERVAL_SECONDS = 20;
const ASCENDER_LOGO = "/brand/ascender-logo.png";

const isLiveMatch = (court: BoardCourtDTO): boolean => {
  if (court.status !== "Warmup" && court.status !== "In Progress") return false;
  return Boolean(
    court.player1 ||
      court.player3 ||
      court.opponentName?.trim() ||
      court.opponentPartnerName?.trim()
  );
};

const OurName = ({
  displayName,
  movedAt,
}: {
  displayName: string;
  movedAt: string | null;
}) => {
  const moved = formatMovedTag(movedAt);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Image
        src={ASCENDER_LOGO}
        alt=""
        width={20}
        height={30}
        className="h-6 w-auto shrink-0"
        aria-hidden="true"
      />
      <span className="font-bold text-slate-950">{displayName}</span>
      {moved && (
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">
          {moved}
        </span>
      )}
    </span>
  );
};

const formatOurSide = (court: BoardCourtDTO) => {
  const parts: React.ReactNode[] = [];
  if (court.player1) {
    parts.push(
      <OurName
        key="p1"
        displayName={court.player1.displayName}
        movedAt={court.player1.movedAt}
      />
    );
  }
  if (court.player3) {
    if (parts.length > 0) {
      parts.push(
        <span key="slash" className="mx-1 font-bold text-slate-400">
          /
        </span>
      );
    }
    parts.push(
      <OurName
        key="p3"
        displayName={court.player3.displayName}
        movedAt={court.player3.movedAt}
      />
    );
  }
  if (parts.length === 0) {
    return <span className="font-bold text-slate-500">TBD</span>;
  }
  return <span className="inline-flex flex-wrap items-center">{parts}</span>;
};

const formatOpponentSide = (court: BoardCourtDTO): string => {
  const names = [
    court.opponentDisplayName,
    court.opponentPartnerDisplayName,
  ].filter(Boolean);
  return names.length > 0 ? names.join(" / ") : "TBD";
};

export const CourtBoard = ({
  initialCourts,
  initialFetchedAt,
}: CourtBoardProps) => {
  const router = useRouter();
  const [courts, setCourts] = useState<BoardCourtDTO[]>(initialCourts);
  const [lastUpdated, setLastUpdated] = useState<string>(initialFetchedAt);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [highlightedCourtId, setHighlightedCourtId] = useState<number | null>(
    null
  );
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(
    POLL_INTERVAL_SECONDS
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [, setTick] = useState(0);

  // Re-render every 30s so elapsed / moved labels stay fresh between polls
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchLatestBoard = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/courts?view=board", {
        cache: "no-store",
      });
      if (response.status === 401) {
        router.refresh();
        return;
      }
      if (!response.ok) return;

      const data = await response.json();
      if (Array.isArray(data?.courts)) {
        setCourts(data.courts);
        setLastUpdated(data.fetchedAt ?? new Date().toISOString());
      }
    } catch {
      // Keep existing state on transient network failure
    } finally {
      setIsRefreshing(false);
      setSecondsUntilRefresh(POLL_INTERVAL_SECONDS);
    }
  }, [router]);

  useEffect(() => {
    const countdownTimer = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          void fetchLatestBoard();
          return POLL_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [fetchLatestBoard]);

  const liveCourts = useMemo(
    () => courts.filter(isLiveMatch),
    [courts]
  );

  const onCourt = useMemo(
    () => liveCourts.filter((c) => c.status === "In Progress"),
    [liveCourts]
  );

  const warmingUp = useMemo(
    () => liveCourts.filter((c) => c.status === "Warmup"),
    [liveCourts]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchingCourtIds = useMemo(() => {
    if (!normalizedQuery) return new Set<number>();
    const ids = new Set<number>();
    for (const court of liveCourts) {
      const haystack = [
        court.player1?.displayName,
        court.player1?.firstName,
        court.player3?.displayName,
        court.player3?.firstName,
        court.opponentDisplayName,
        court.opponentName,
        court.opponentPartnerDisplayName,
        court.opponentPartnerName,
        court.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (haystack.includes(normalizedQuery)) ids.add(court.id);
    }
    return ids;
  }, [liveCourts, normalizedQuery]);

  const handleJumpToCourt = (courtId: number) => {
    setHighlightedCourtId(courtId);
    const el = document.getElementById(`match-row-${courtId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightedCourtId(null), 2500);
  };

  const handleClearSearch = () => setSearchQuery("");

  const handleManualRefresh = () => void fetchLatestBoard();

  const updatedLabel = useMemo(() => {
    try {
      return new Date(lastUpdated).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, [lastUpdated]);

  const renderMatchRow = (court: BoardCourtDTO) => {
    const isMatch =
      matchingCourtIds.has(court.id) || highlightedCourtId === court.id;
    const elapsed = formatElapsedLabel(court.status, court.statusChangedAt);

    return (
      <li
        key={court.id}
        id={`match-row-${court.id}`}
        tabIndex={0}
        aria-label={`${court.player1?.displayName ?? "Player"} on ${court.name}, ${elapsed}`}
        className={cn(
          "rounded-2xl border bg-white px-3 py-3.5 shadow-sm transition sm:px-4",
          court.status === "In Progress"
            ? "border-ball/50"
            : "border-amber-200",
          isMatch && "ring-3 ring-brand-500 border-brand-500 bg-brand-50/50"
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="text-lg leading-snug text-slate-950 sm:text-xl">
              {formatOurSide(court)}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base sm:text-lg">
              <span className="font-bold text-brand-800">{court.name}</span>
              <span className="font-semibold uppercase tracking-wide text-slate-400">
                vs
              </span>
              <span className="font-semibold text-slate-800">
                {formatOpponentSide(court)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant={
                court.status === "Warmup" ? "warmup" : "inProgress"
              }
              className="px-2.5 py-1 text-xs sm:text-sm"
            >
              {court.status === "Warmup" ? (
                <Clock className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <CircleDot
                  className="mr-1 h-3.5 w-3.5 animate-pulse"
                  aria-hidden="true"
                />
              )}
              {elapsed}
            </Badge>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="sticky top-[106px] z-20 space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type a player or coach name"
              aria-label="Search by player, coach, or opponent name"
              className="h-11 pl-9 pr-9 text-base"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>
              Updated {updatedLabel}
              {secondsUntilRefresh > 0
                ? ` · refresh in ${secondsUntilRefresh}s`
                : ""}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              aria-label="Refresh board now"
              className="h-9"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
              />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {normalizedQuery && matchingCourtIds.size > 0 && (
          <div className="flex flex-wrap gap-2">
            {liveCourts
              .filter((c) => matchingCourtIds.has(c.id))
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleJumpToCourt(c.id)}
                  aria-label={`Jump to ${c.name}`}
                  tabIndex={0}
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-2xs transition hover:border-brand-500 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {c.player1?.displayName ?? "Match"} · {c.name}
                </button>
              ))}
          </div>
        )}
        {normalizedQuery && matchingCourtIds.size === 0 && (
          <p className="text-sm text-slate-500">
            No live matches match &ldquo;{searchQuery.trim()}&rdquo;.
          </p>
        )}
      </div>

      {liveCourts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-lg font-medium text-slate-500">
          No matches on court right now.
        </p>
      ) : (
        <div className="space-y-8">
          {onCourt.length > 0 && (
            <section aria-label="On court">
              <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                ON COURT ({onCourt.length})
              </h2>
              <ul className="space-y-3">{onCourt.map(renderMatchRow)}</ul>
            </section>
          )}

          {warmingUp.length > 0 && (
            <section aria-label="Warming up">
              <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                WARMING UP ({warmingUp.length})
              </h2>
              <ul className="space-y-3">{warmingUp.map(renderMatchRow)}</ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
