"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  MapPin,
  Users,
  X,
  Lock,
  Sparkles,
  CheckCircle2,
  Clock,
  Wrench,
  CircleDot,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BoardCourtDTO } from "@/lib/queries";
import type { CourtZone, MatchStatus } from "@/db/schema";

interface CourtBoardProps {
  initialCourts: BoardCourtDTO[];
  initialFetchedAt: string;
}

type ZoneFilterTab =
  | "All"
  | "Stadium"
  | "Hard"
  | "East Clay"
  | "Legacy"
  | "Indoors";

const ZONE_ORDER: CourtZone[] = [
  "Stadium",
  "Hard Courts",
  "East Clay",
  "Legacy",
  "Indoors",
];

const TAB_TO_ZONE_MAP: Record<Exclude<ZoneFilterTab, "All">, CourtZone> = {
  Stadium: "Stadium",
  Hard: "Hard Courts",
  "East Clay": "East Clay",
  Legacy: "Legacy",
  Indoors: "Indoors",
};

const POLL_INTERVAL_SECONDS = 20;

const getStatusBadgeVariant = (status: MatchStatus) => {
  if (status === "Warmup") return "warmup";
  if (status === "In Progress") return "inProgress";
  if (status === "Maintenance") return "maintenance";
  return "open";
};

const getStatusIcon = (status: MatchStatus) => {
  if (status === "Warmup") {
    return <Clock className="mr-1 h-3 w-3 text-amber-700" aria-hidden="true" />;
  }
  if (status === "In Progress") {
    return (
      <CircleDot
        className="mr-1 h-3 w-3 animate-pulse text-ink"
        aria-hidden="true"
      />
    );
  }
  if (status === "Maintenance") {
    return <Wrench className="mr-1 h-3 w-3 text-rose-700" aria-hidden="true" />;
  }
  return (
    <CheckCircle2 className="mr-1 h-3 w-3 text-slate-500" aria-hidden="true" />
  );
};

export const CourtBoard = ({
  initialCourts,
  initialFetchedAt,
}: CourtBoardProps) => {
  const router = useRouter();
  const [courts, setCourts] = useState<BoardCourtDTO[]>(initialCourts);
  const [lastUpdated, setLastUpdated] = useState<string>(initialFetchedAt);
  const [selectedTab, setSelectedTab] = useState<ZoneFilterTab>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [highlightedCourtId, setHighlightedCourtId] = useState<number | null>(
    null
  );
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(
    POLL_INTERVAL_SECONDS
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

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

  // 20-second polling interval + 1-second visual countdown
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

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Matching player assignments for live search jump bar
  const matchingPlayerAssignments = useMemo(() => {
    if (!normalizedQuery) return [];

    const results: Array<{
      playerId: number;
      displayName: string;
      courtId: number;
      courtName: string;
      zone: CourtZone;
      status: MatchStatus;
    }> = [];

    for (const court of courts) {
      const playersOnCourt = [court.player1, court.player2].filter(
        (p): p is NonNullable<typeof p> => Boolean(p)
      );

      for (const player of playersOnCourt) {
        const matchesDisplay = player.displayName
          .toLowerCase()
          .includes(normalizedQuery);
        const matchesFirst = player.firstName
          .toLowerCase()
          .includes(normalizedQuery);

        if (matchesDisplay || matchesFirst) {
          results.push({
            playerId: player.id,
            displayName: player.displayName,
            courtId: court.id,
            courtName: court.name,
            zone: court.zone,
            status: court.status,
          });
        }
      }
    }

    return results;
  }, [courts, normalizedQuery]);

  const matchingCourtIdsSet = useMemo(() => {
    return new Set(matchingPlayerAssignments.map((item) => item.courtId));
  }, [matchingPlayerAssignments]);

  const handleJumpToCourt = (courtId: number) => {
    setSelectedTab("All");
    setHighlightedCourtId(courtId);

    setTimeout(() => {
      const element = document.getElementById(`court-card-${courtId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 60);
  };

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter" && matchingPlayerAssignments.length > 0) {
      event.preventDefault();
      handleJumpToCourt(matchingPlayerAssignments[0].courtId);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setHighlightedCourtId(null);
  };

  const handleLockBoard = async () => {
    await fetch("/api/board-auth", { method: "DELETE" });
    router.refresh();
  };

  // Filter courts by selected zone tab
  const filteredCourts = useMemo(() => {
    if (selectedTab === "All") return courts;
    const targetZone = TAB_TO_ZONE_MAP[selectedTab];
    return courts.filter((court) => court.zone === targetZone);
  }, [courts, selectedTab]);

  // Group filtered courts by zone in exact facility order
  const courtsByZone = useMemo(() => {
    const grouped = new Map<CourtZone, BoardCourtDTO[]>();
    for (const zone of ZONE_ORDER) {
      const list = filteredCourts.filter((c) => c.zone === zone);
      if (list.length > 0) {
        grouped.set(zone, list);
      }
    }
    return grouped;
  }, [filteredCourts]);

  // Status summary counts
  const statusSummary = useMemo(() => {
    return courts.reduce(
      (acc, court) => {
        acc[court.status] = (acc[court.status] || 0) + 1;
        return acc;
      },
      {
        "In Progress": 0,
        Warmup: 0,
        Open: 0,
        Maintenance: 0,
      } as Record<MatchStatus, number>
    );
  }, [courts]);

  const formattedUpdatedTime = useMemo(() => {
    try {
      return new Date(lastUpdated).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "";
    }
  }, [lastUpdated]);

  return (
    <div className="space-y-6 pb-16">
      {/* Live Status Bar & Controls */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-1 text-xs font-semibold tracking-wide text-white">
                <span className="h-2 w-2 rounded-full bg-ball animate-pulse" />
                LIVE
              </span>
              <span className="text-xs text-slate-500">
                Auto-refresh in{" "}
                <strong className="font-semibold text-slate-700">
                  {secondsUntilRefresh}s
                </strong>{" "}
                {formattedUpdatedTime && `(Updated ${formattedUpdatedTime})`}
              </span>
            </div>
            <h2 className="mt-2 text-3xl font-bold text-brand sm:text-4xl">
              Court assignments
            </h2>
          </div>

          {/* Status Summary Pills & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="inProgress" className="px-3 py-1 text-xs">
              In Progress: {statusSummary["In Progress"]}
            </Badge>
            <Badge variant="warmup" className="px-3 py-1 text-xs">
              Warmup: {statusSummary.Warmup}
            </Badge>
            <Badge variant="open" className="px-3 py-1 text-xs">
              Open: {statusSummary.Open}
            </Badge>
            <Badge variant="maintenance" className="px-3 py-1 text-xs">
              Maintenance: {statusSummary.Maintenance}
            </Badge>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fetchLatestBoard()}
              disabled={isRefreshing}
              aria-label="Refresh court assignments now"
              tabIndex={0}
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
              />
              <span>Refresh</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLockBoard}
              aria-label="Lock board and clear PIN session"
              tabIndex={0}
              className="text-slate-500 hover:text-slate-800"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lock PIN</span>
            </Button>
          </div>
        </div>

        {/* Live Player Search Bar + Jump-to-Court Results */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search player name (e.g. Arthur P., Bianca V., Carlos M.) to highlight & jump to court..."
              aria-label="Search player name to highlight and jump to assigned court"
              className="h-11 pl-10 pr-24 text-sm sm:text-base"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear player search"
                tabIndex={0}
                className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          {/* Search Match Jump Chips */}
          {normalizedQuery && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
              {matchingPlayerAssignments.length === 0 ? (
                <p className="text-xs font-medium text-slate-600">
                  No active court assignment found matching{" "}
                  <span className="font-semibold text-slate-900">
                    &ldquo;{searchQuery}&rdquo;
                  </span>
                  .
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span>
                      Found {matchingPlayerAssignments.length} assigned{" "}
                      {matchingPlayerAssignments.length === 1
                        ? "player"
                        : "players"}{" "}
                      — click to jump &amp; highlight court:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {matchingPlayerAssignments.map((match) => (
                      <button
                        key={`${match.courtId}-${match.playerId}`}
                        type="button"
                        onClick={() => handleJumpToCourt(match.courtId)}
                        aria-label={`Jump to ${match.courtName} for player ${match.displayName}`}
                        tabIndex={0}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-2xs transition hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <span className="text-emerald-700">
                          {match.displayName}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                          <MapPin className="h-3 w-3 text-emerald-600" />
                          {match.courtName}
                        </span>
                        <Badge
                          variant={getStatusBadgeVariant(match.status)}
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {match.status}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick-Filter Zone Tabs */}
        <div className="mt-4 overflow-x-auto pb-1">
          <Tabs
            value={selectedTab}
            onValueChange={(val) => setSelectedTab(val as ZoneFilterTab)}
          >
            <TabsList
              aria-label="Filter courts by facility zone"
              className="flex w-max min-w-full sm:w-auto justify-start gap-1"
            >
              <TabsTrigger value="All">All (49)</TabsTrigger>
              <TabsTrigger value="Stadium">Stadium (2)</TabsTrigger>
              <TabsTrigger value="Hard">Hard (28)</TabsTrigger>
              <TabsTrigger value="East Clay">East Clay (9)</TabsTrigger>
              <TabsTrigger value="Legacy">Legacy (6)</TabsTrigger>
              <TabsTrigger value="Indoors">Indoors (4)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Grouped Court Grid by Zone */}
      <div className="space-y-8">
        {Array.from(courtsByZone.entries()).map(([zoneName, zoneCourts]) => (
          <section
            key={zoneName}
            aria-label={`${zoneName} Zone Courts`}
            className="space-y-3"
          >
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  {zoneName}
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {zoneCourts.length}{" "}
                  {zoneCourts.length === 1 ? "Court" : "Courts"}
                </Badge>
              </div>
              <span className="text-xs font-medium text-slate-500">
                Privacy Mode: First Name + Last Initial
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {zoneCourts.map((court) => {
                const isSearchMatch = matchingCourtIdsSet.has(court.id);
                const isJumpHighlighted = highlightedCourtId === court.id;
                const hasPlayers = Boolean(court.player1 || court.player2);

                return (
                  <Card
                    key={court.id}
                    id={`court-card-${court.id}`}
                    tabIndex={0}
                    aria-label={`${court.name}, status ${court.status}`}
                    className={cn(
                      "relative overflow-hidden transition-all duration-300",
                      court.status === "In Progress" &&
                        "border-ball/60 bg-white",
                      court.status === "Warmup" && "border-amber-200 bg-white",
                      court.status === "Open" &&
                        "border-slate-200 bg-slate-50/60",
                      court.status === "Maintenance" &&
                        "border-rose-200 bg-rose-50/30",
                      (isSearchMatch || isJumpHighlighted) &&
                        "ring-3 ring-emerald-500 border-emerald-500 bg-emerald-50/40 shadow-md scale-[1.01]"
                    )}
                  >
                    {/* Top Status Accent Bar */}
                    <div
                      className={cn(
                        "h-1.5 w-full",
                        court.status === "In Progress" && "bg-ball",
                        court.status === "Warmup" && "bg-amber-400",
                        court.status === "Open" && "bg-slate-200",
                        court.status === "Maintenance" && "bg-rose-500"
                      )}
                    />

                    <CardContent className="p-4 pt-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            {court.zone}
                          </span>
                          <h3 className="font-display text-xl font-bold uppercase leading-tight text-slate-900">
                            {court.name}
                          </h3>
                        </div>

                        <Badge
                          variant={getStatusBadgeVariant(court.status)}
                          className="shrink-0"
                        >
                          {getStatusIcon(court.status)}
                          {court.status}
                        </Badge>
                      </div>

                      {/* Assigned Players Box */}
                      <div className="mt-3.5 rounded-lg border border-slate-100 bg-slate-50/80 p-2.5">
                        {court.status === "Maintenance" ? (
                          <div className="flex items-center justify-center py-2 text-xs font-medium text-rose-700">
                            Court Temporarily Closed for Maintenance
                          </div>
                        ) : !hasPlayers ? (
                          <div className="flex items-center justify-center py-2 text-xs font-medium text-slate-400">
                            Available — No Match Assigned
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                                <Users className="h-3.5 w-3.5 text-emerald-600" />
                                {court.player1?.displayName ?? "TBD"}
                              </span>
                              <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                                P1
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="h-px flex-1 bg-slate-200" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                VS
                              </span>
                              <div className="h-px flex-1 bg-slate-200" />
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                                <Users className="h-3.5 w-3.5 text-emerald-600" />
                                {court.player2?.displayName ?? "TBD"}
                              </span>
                              <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                                P2
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
