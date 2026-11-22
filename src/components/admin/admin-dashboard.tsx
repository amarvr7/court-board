"use client";

import React, { useState, useMemo, useRef } from "react";
import Papa from "papaparse";
import {
  Upload,
  FileSpreadsheet,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Save,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdminCourtDTO, AdminPlayerDTO } from "@/lib/queries";
import type { CourtZone, MatchStatus } from "@/db/schema";
import type { BulkUploadRow } from "@/app/api/admin/bulk-upload/route";

interface AdminDashboardProps {
  initialCourts: AdminCourtDTO[];
  initialPlayers: AdminPlayerDTO[];
}

type ZoneFilterTab =
  | "All"
  | "Stadium"
  | "Hard"
  | "East Clay"
  | "Legacy"
  | "Indoors";

const TAB_TO_ZONE_MAP: Record<Exclude<ZoneFilterTab, "All">, CourtZone> = {
  Stadium: "Stadium",
  Hard: "Hard Courts",
  "East Clay": "East Clay",
  Legacy: "Legacy",
  Indoors: "Indoors",
};

const MATCH_STATUS_OPTIONS: MatchStatus[] = [
  "Warmup",
  "In Progress",
  "Open",
  "Maintenance",
];

const SAMPLE_CSV_CONTENT = `courtName,status,player1,player2
Stadium Hard,In Progress,Arthur Pendelton,Carlos Mendoza
Clay Hard,Warmup,Bianca Vance,Diana Kovacs
Hard 1,In Progress,Ethan Blackwood,Gabriel Sorrento
Hard 2,In Progress,Fiona Gallagher,Hannah Lindqvist
East Clay 1,Warmup,Isaac Thornton,Kai Takahashi
Legacy 1,In Progress,Elena Rostova,Nadia Petrova
Indoors 1,Maintenance,,`;

export const AdminDashboard = ({
  initialCourts,
  initialPlayers,
}: AdminDashboardProps) => {
  const [courts, setCourts] = useState<AdminCourtDTO[]>(initialCourts);
  const [players, setPlayers] = useState<AdminPlayerDTO[]>(initialPlayers);
  const [selectedTab, setSelectedTab] = useState<ZoneFilterTab>("All");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [savingCourtId, setSavingCourtId] = useState<number | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Client-side PapaParse CSV state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [parsedCsvRows, setParsedCsvRows] = useState<BulkUploadRow[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>("");
  const [isUploadingCsv, setIsUploadingCsv] = useState<boolean>(false);

  const normalizeCsvHeaderRow = (
    rawRow: Record<string, string>
  ): BulkUploadRow => {
    const normalized: Record<string, string> = {};
    for (const [key, val] of Object.entries(rawRow)) {
      normalized[key.trim().toLowerCase().replace(/[\s_-]+/g, "")] = (
        val ?? ""
      ).trim();
    }

    return {
      courtName:
        normalized.courtname || normalized.court || normalized.facilitycourt || "",
      status: normalized.status || normalized.matchstatus || "Open",
      player1: normalized.player1 || normalized.p1 || "",
      player2: normalized.player2 || normalized.p2 || "",
      player1FirstName: normalized.player1firstname || "",
      player1LastName: normalized.player1lastname || "",
      player2FirstName: normalized.player2firstname || "",
      player2LastName: normalized.player2lastname || "",
    };
  };

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setBannerMessage(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = results.data
          .map(normalizeCsvHeaderRow)
          .filter((row) => Boolean(row.courtName));
        setParsedCsvRows(mapped);
        if (mapped.length === 0) {
          setBannerMessage({
            type: "error",
            text: "No valid rows with a 'courtName' column were found in the CSV file.",
          });
        }
      },
      error: (err) => {
        setBannerMessage({
          type: "error",
          text: `Failed to parse CSV locally: ${err.message}`,
        });
      },
    });
  };

  const handleLoadSampleCsvPreview = () => {
    setCsvFileName("sample-court-assignments.csv");
    Papa.parse<Record<string, string>>(SAMPLE_CSV_CONTENT, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = results.data
          .map(normalizeCsvHeaderRow)
          .filter((row) => Boolean(row.courtName));
        setParsedCsvRows(mapped);
        setBannerMessage({
          type: "success",
          text: `Parsed ${mapped.length} sample rows locally in browser via PapaParse. Click "Save Parsed CSV to Neon" to commit.`,
        });
      },
    });
  };

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "court-assignments-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveParsedCsvToNeon = async () => {
    if (parsedCsvRows.length === 0) return;
    setIsUploadingCsv(true);
    setBannerMessage(null);

    try {
      const response = await fetch("/api/admin/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedCsvRows }),
      });

      const data = await response.json();
      if (!response.ok) {
        setBannerMessage({
          type: "error",
          text: data?.error ?? "Failed to save CSV assignments to Neon.",
        });
        setIsUploadingCsv(false);
        return;
      }

      if (Array.isArray(data?.courts)) setCourts(data.courts);
      if (Array.isArray(data?.players)) setPlayers(data.players);

      const unmatchedText =
        Array.isArray(data?.unmatchedCourts) && data.unmatchedCourts.length > 0
          ? ` (Unmatched court names skipped: ${data.unmatchedCourts.join(", ")})`
          : "";

      setBannerMessage({
        type: "success",
        text: `Successfully updated ${data.updatedCourtsCount} courts in Neon Postgres!${unmatchedText}`,
      });
      setParsedCsvRows([]);
      setCsvFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setBannerMessage({
        type: "error",
        text: "Network error while saving bulk CSV assignments.",
      });
    } finally {
      setIsUploadingCsv(false);
    }
  };

  const handleQuickUpdateCourt = async (
    courtId: number,
    updates: {
      status?: MatchStatus;
      player1Id?: number | null;
      player2Id?: number | null;
      action?: "clear";
    }
  ) => {
    setSavingCourtId(courtId);
    setBannerMessage(null);

    try {
      const response = await fetch("/api/courts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId,
          ...updates,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setBannerMessage({
          type: "error",
          text: data?.error ?? "Failed to update court.",
        });
        return;
      }

      if (Array.isArray(data?.courts)) setCourts(data.courts);
      if (Array.isArray(data?.players)) setPlayers(data.players);
    } catch {
      setBannerMessage({
        type: "error",
        text: "Network error while updating court.",
      });
    } finally {
      setSavingCourtId(null);
    }
  };

  const filteredCourts = useMemo(() => {
    const query = searchFilter.trim().toLowerCase();
    return courts.filter((court) => {
      if (selectedTab !== "All") {
        const expectedZone = TAB_TO_ZONE_MAP[selectedTab];
        if (court.zone !== expectedZone) return false;
      }

      if (!query) return true;

      const matchesName = court.name.toLowerCase().includes(query);
      const matchesZone = court.zone.toLowerCase().includes(query);
      const matchesP1 =
        court.player1?.fullName.toLowerCase().includes(query) ?? false;
      const matchesP2 =
        court.player2?.fullName.toLowerCase().includes(query) ?? false;

      return matchesName || matchesZone || matchesP1 || matchesP2;
    });
  }, [courts, selectedTab, searchFilter]);

  return (
    <div className="space-y-6 pb-16">

      {/* Status Notification Banner */}
      {bannerMessage && (
        <div
          role="status"
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium",
            bannerMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          )}
        >
          <div className="flex items-center gap-2">
            {bannerMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-xs underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section 1: Client-Side CSV Bulk Uploader (PapaParse) */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                Client-Side CSV Bulk Uploader (PapaParse)
              </CardTitle>
              <CardDescription className="mt-1">
                CSV files are parsed 100% locally in your browser via PapaParse before saving court assignments to Neon Postgres. Store local exports in{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700">
                  /local-data
                </code>{" "}
                (ignored by <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700">.cursorignore</code> &amp;{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700">.gitignore</code>).
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadSampleCsvPreview}
                aria-label="Preview sample CSV in browser"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>Load Sample CSV</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadSampleCsv}
                aria-label="Download CSV template"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Template</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-6 text-center transition hover:border-emerald-500 hover:bg-emerald-50/20">
            <Upload className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-slate-800">
              Select a CSV file to parse locally in the browser
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Columns: <code>courtName, status, player1, player2</code>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileChange}
              aria-label="Upload CSV file for local PapaParse processing"
              className="mt-3 block text-xs text-slate-600 file:mr-3 file: cursor-pointer file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-emerald-700"
            />
          </div>

          {/* Local Browser Preview Table before saving to Neon */}
          {parsedCsvRows.length > 0 && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Local Browser Preview ({parsedCsvRows.length} rows from{" "}
                    <span className="text-emerald-700">{csvFileName}</span>)
                  </h4>
                  <p className="text-xs text-slate-600">
                    Review parsed assignments below, then commit to Neon Postgres.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setParsedCsvRows([]);
                      setCsvFileName("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveParsedCsvToNeon}
                    disabled={isUploadingCsv}
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>
                      {isUploadingCsv
                        ? "Saving to Neon..."
                        : `Save ${parsedCsvRows.length} Rows to Neon`}
                    </span>
                  </Button>
                </div>
              </div>

              <div className="max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Court Name</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Player 1</th>
                      <th className="px-3 py-2">Player 2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedCsvRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          {row.courtName}
                        </td>
                        <td className="px-3 py-2">{row.status || "Open"}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.player1 || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.player2 || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Quick-Edit Court Controls (49 Courts) */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                Quick-Edit Court Assignments &amp; Statuses ({courts.length} Courts •{" "}
                {players.length} Seeded Players)
              </CardTitle>
              <CardDescription>
                Assign players, switch match status badges, or clear courts in one click. Public board displays names as First Name + Last Initial.
              </CardDescription>
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter by court or player name..."
                aria-label="Filter courts by name or assigned player"
                className="h-9 pl-9 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="mt-3 overflow-x-auto pb-1">
            <Tabs
              value={selectedTab}
              onValueChange={(val) => setSelectedTab(val as ZoneFilterTab)}
            >
              <TabsList aria-label="Filter admin courts by zone">
                <TabsTrigger value="All">All (49)</TabsTrigger>
                <TabsTrigger value="Stadium">Stadium (2)</TabsTrigger>
                <TabsTrigger value="Hard">Hard (28)</TabsTrigger>
                <TabsTrigger value="East Clay">East Clay (9)</TabsTrigger>
                <TabsTrigger value="Legacy">Legacy (6)</TabsTrigger>
                <TabsTrigger value="Indoors">Indoors (4)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourts.map((court) => {
              const isSaving = savingCourtId === court.id;

              return (
                <div
                  key={court.id}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border p-3.5 transition-all",
                    court.status === "In Progress" &&
                      "border-emerald-200 bg-emerald-50/20",
                    court.status === "Warmup" &&
                      "border-amber-200 bg-amber-50/20",
                    court.status === "Open" && "border-slate-200 bg-white",
                    court.status === "Maintenance" &&
                      "border-rose-200 bg-rose-50/20",
                    isSaving && "opacity-60 pointer-events-none"
                  )}
                >
                  <div>
                    {/* Court Header + Clear Button */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          #{court.sortOrder} • {court.zone}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">
                          {court.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={
                            court.status === "In Progress"
                              ? "inProgress"
                              : court.status === "Warmup"
                              ? "warmup"
                              : court.status === "Maintenance"
                              ? "maintenance"
                              : "open"
                          }
                        >
                          {court.status}
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void handleQuickUpdateCourt(court.id, {
                              action: "clear",
                            })
                          }
                          disabled={isSaving}
                          aria-label={`Clear ${court.name}`}
                          className="h-7 px-2 text-xs text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Clear</span>
                        </Button>
                      </div>
                    </div>

                    {/* Controls Form */}
                    <div className="mt-3 space-y-2.5">
                      {/* Match Status Select */}
                      <div>
                        <label
                          htmlFor={`status-${court.id}`}
                          className="mb-1 block text-[11px] font-semibold text-slate-600"
                        >
                          Match Status
                        </label>
                        <select
                          id={`status-${court.id}`}
                          value={court.status}
                          onChange={(e) =>
                            void handleQuickUpdateCourt(court.id, {
                              status: e.target.value as MatchStatus,
                            })
                          }
                          disabled={isSaving}
                          aria-label={`Match status for ${court.name}`}
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          {MATCH_STATUS_OPTIONS.map((statusOption) => (
                            <option key={statusOption} value={statusOption}>
                              {statusOption}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Player 1 Select */}
                      <div>
                        <label
                          htmlFor={`p1-${court.id}`}
                          className="mb-1 block text-[11px] font-semibold text-slate-600"
                        >
                          Player 1{" "}
                          {court.player1 && (
                            <span className="font-normal text-emerald-700">
                              (Board: {court.player1.privacyName})
                            </span>
                          )}
                        </label>
                        <select
                          id={`p1-${court.id}`}
                          value={court.player1Id ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            void handleQuickUpdateCourt(court.id, {
                              player1Id: val ? Number(val) : null,
                              status:
                                val && court.status === "Open"
                                  ? "Warmup"
                                  : undefined,
                            });
                          }}
                          disabled={isSaving}
                          aria-label={`Assign Player 1 for ${court.name}`}
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="">— Unassigned —</option>
                          {players.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.fullName} ({p.privacyName})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Player 2 Select */}
                      <div>
                        <label
                          htmlFor={`p2-${court.id}`}
                          className="mb-1 block text-[11px] font-semibold text-slate-600"
                        >
                          Player 2{" "}
                          {court.player2 && (
                            <span className="font-normal text-emerald-700">
                              (Board: {court.player2.privacyName})
                            </span>
                          )}
                        </label>
                        <select
                          id={`p2-${court.id}`}
                          value={court.player2Id ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            void handleQuickUpdateCourt(court.id, {
                              player2Id: val ? Number(val) : null,
                              status:
                                val && court.status === "Open"
                                  ? "Warmup"
                                  : undefined,
                            });
                          }}
                          disabled={isSaving}
                          aria-label={`Assign Player 2 for ${court.name}`}
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="">— Unassigned —</option>
                          {players.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.fullName} ({p.privacyName})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
