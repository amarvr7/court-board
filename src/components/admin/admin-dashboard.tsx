"use client";

import React, { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Save,
  Mail,
  Copy,
  Trash2,
  Users,
  Plus,
  X,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import type {
  AdminCourtDTO,
  AdminPlayerDTO,
  DeskSettingsDTO,
} from "@/lib/queries";
import type { MatchStatus } from "@/db/schema";
import type { BulkUploadRow } from "@/lib/bulk-upload-types";
import {
  buildCoachEmailBody,
  formatEmailSubject,
  formatMatchLine,
} from "@/lib/match-text";

interface AdminDashboardProps {
  initialCourts: AdminCourtDTO[];
  initialPlayers: AdminPlayerDTO[];
  initialDeskSettings: DeskSettingsDTO;
}

const SAMPLE_CSV_CONTENT = `court,player,opponent,status,partner,opponentPartner
Hard 12,Maya Reyes,Jordan Smith,In Progress,,
East Clay 3,Leo Tran,Ana Perez,In Progress,,
Stadium Hard,Sam Lee,Chris Davis,Warmup,,
Hard 1,Ava Chen,Jordan Smith,In Progress,Eli Brooks,Kai Nguyen
`;

const LIVE_STATUSES: MatchStatus[] = ["Warmup", "In Progress"];

const parseCoachEmailList = (raw: string): string[] =>
  raw
    .split(/[\n,;]+/)
    .map((email) => email.trim())
    .filter(Boolean);

const dedupeEmails = (emails: string[]): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const email of emails) {
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(email);
  }
  return unique;
};

const isCourtOccupied = (court: AdminCourtDTO): boolean =>
  court.player1Id != null ||
  court.player3Id != null ||
  Boolean(court.opponentName?.trim()) ||
  court.status === "Warmup" ||
  court.status === "In Progress";

export const AdminDashboard = ({
  initialCourts,
  initialPlayers,
  initialDeskSettings,
}: AdminDashboardProps) => {
  const [courts, setCourts] = useState<AdminCourtDTO[]>(initialCourts);
  const [players, setPlayers] = useState<AdminPlayerDTO[]>(initialPlayers);
  const [coachEmails, setCoachEmails] = useState<string>(
    initialDeskSettings.coachEmails
  );
  const [mainTab, setMainTab] = useState<"matches" | "roster" | "csv">(
    "matches"
  );
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
    details?: string[];
  } | null>(null);

  // Add match form
  const [formPlayerId, setFormPlayerId] = useState<string>("");
  const [formCourtId, setFormCourtId] = useState<string>("");
  const [formOpponent, setFormOpponent] = useState<string>("");
  const [formStatus, setFormStatus] = useState<"Warmup" | "In Progress">(
    "In Progress"
  );
  const [formDoubles, setFormDoubles] = useState<boolean>(false);
  const [formPartnerId, setFormPartnerId] = useState<string>("");
  const [formOpponentPartner, setFormOpponentPartner] = useState<string>("");
  const [playerSearch, setPlayerSearch] = useState<string>("");
  const [partnerSearch, setPartnerSearch] = useState<string>("");
  const [isSavingMatch, setIsSavingMatch] = useState<boolean>(false);
  const [savingCourtId, setSavingCourtId] = useState<number | null>(null);

  // Roster
  const [rosterPaste, setRosterPaste] = useState<string>("");
  const [isSavingRoster, setIsSavingRoster] = useState<boolean>(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<number | null>(null);

  // Coach email group
  const [emailDraft, setEmailDraft] = useState<string>("");
  const [isSavingEmails, setIsSavingEmails] = useState<boolean>(false);
  const [copyDone, setCopyDone] = useState<boolean>(false);

  const savedEmailList = useMemo(
    () => dedupeEmails(parseCoachEmailList(coachEmails)),
    [coachEmails]
  );

  // CSV
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [parsedCsvRows, setParsedCsvRows] = useState<BulkUploadRow[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>("");
  const [isUploadingCsv, setIsUploadingCsv] = useState<boolean>(false);

  const applyAdminData = (data: {
    courts?: AdminCourtDTO[];
    players?: AdminPlayerDTO[];
    deskSettings?: DeskSettingsDTO;
  }) => {
    if (Array.isArray(data?.courts)) setCourts(data.courts);
    if (Array.isArray(data?.players)) setPlayers(data.players);
    if (data?.deskSettings?.coachEmails != null) {
      setCoachEmails(data.deskSettings.coachEmails);
    }
  };

  const liveMatches = useMemo(() => {
    return courts.filter(
      (c) =>
        (c.status === "Warmup" || c.status === "In Progress") &&
        (c.player1Id != null ||
          c.player3Id != null ||
          Boolean(c.opponentName?.trim()))
    );
  }, [courts]);

  const courtNameByPlayerId = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of courts) {
      if (c.player1Id) map.set(c.player1Id, c.name);
      if (c.player3Id) map.set(c.player3Id, c.name);
    }
    return map;
  }, [courts]);

  const emptyCourts = useMemo(
    () => courts.filter((c) => !isCourtOccupied(c)),
    [courts]
  );

  const filteredPlayersForForm = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.privacyName.toLowerCase().includes(q)
    );
  }, [players, playerSearch]);

  const filteredPartnersForForm = useMemo(() => {
    const q = partnerSearch.trim().toLowerCase();
    const list = players.filter((p) => String(p.id) !== formPlayerId);
    if (!q) return list;
    return list.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.privacyName.toLowerCase().includes(q)
    );
  }, [players, partnerSearch, formPlayerId]);

  const matchLinesForEmail = useMemo(() => {
    return liveMatches.map((m) => ({
      courtName: m.name,
      status: m.status,
      playerPrivacyName: m.player1?.privacyName,
      partnerPrivacyName: m.player3?.privacyName,
      opponentName: m.opponentName,
      opponentPartnerName: m.opponentPartnerName,
    }));
  }, [liveMatches]);

  const handleResetForm = () => {
    setFormPlayerId("");
    setFormCourtId("");
    setFormOpponent("");
    setFormStatus("In Progress");
    setFormDoubles(false);
    setFormPartnerId("");
    setFormOpponentPartner("");
    setPlayerSearch("");
    setPartnerSearch("");
  };

  const handleSaveMatch = async () => {
    const courtId = Number(formCourtId);
    const player1Id = Number(formPlayerId);
    if (!courtId || !player1Id) {
      setBannerMessage({
        type: "error",
        text: "Pick our player and a court.",
      });
      return;
    }
    if (!formOpponent.trim()) {
      setBannerMessage({
        type: "error",
        text: "Type the opponent's name.",
      });
      return;
    }

    setIsSavingMatch(true);
    setBannerMessage(null);

    try {
      const response = await fetch("/api/courts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId,
          player1Id,
          player3Id: formDoubles && formPartnerId ? Number(formPartnerId) : null,
          opponentName: formOpponent.trim(),
          opponentPartnerName: formDoubles
            ? formOpponentPartner.trim() || null
            : null,
          status: formStatus,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setBannerMessage({
          type: "error",
          text: data?.error ?? "Couldn't save the match.",
        });
        return;
      }
      applyAdminData(data);
      handleResetForm();
      setBannerMessage({ type: "success", text: "Match saved to the board." });
    } catch {
      setBannerMessage({
        type: "error",
        text: "Couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      setIsSavingMatch(false);
    }
  };

  const handleCourtAction = async (
    courtId: number,
    payload: Record<string, unknown>
  ) => {
    setSavingCourtId(courtId);
    setBannerMessage(null);
    try {
      const response = await fetch("/api/courts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courtId, ...payload }),
      });
      const data = await response.json();
      if (!response.ok) {
        setBannerMessage({
          type: "error",
          text: data?.error ?? "Couldn't update that match.",
        });
        return;
      }
      applyAdminData(data);
    } catch {
      setBannerMessage({
        type: "error",
        text: "Couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      setSavingCourtId(null);
    }
  };

  const handleToggleStatus = (court: AdminCourtDTO) => {
    const next: MatchStatus =
      court.status === "Warmup" ? "In Progress" : "Warmup";
    void handleCourtAction(court.id, { action: "update", status: next });
  };

  const handleChangeCourt = (court: AdminCourtDTO, toCourtId: string) => {
    const dest = Number(toCourtId);
    if (!dest) return;
    void handleCourtAction(court.id, { action: "move", toCourtId: dest });
  };

  const handleAddRoster = async () => {
    if (!rosterPaste.trim()) return;
    setIsSavingRoster(true);
    setBannerMessage(null);
    try {
      const response = await fetch("/api/admin/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: rosterPaste }),
      });
      const data = await response.json();
      if (!response.ok) {
        setBannerMessage({
          type: "error",
          text: data?.error ?? "Couldn't add players.",
        });
        return;
      }
      applyAdminData(data);
      setRosterPaste("");
      const skipped =
        Array.isArray(data?.skipped) && data.skipped.length > 0
          ? ` Skipped duplicates: ${data.skipped.join(", ")}.`
          : "";
      setBannerMessage({
        type: "success",
        text: `Added ${data.addedCount} player${data.addedCount === 1 ? "" : "s"}.${skipped}`,
      });
    } catch {
      setBannerMessage({
        type: "error",
        text: "Couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      setIsSavingRoster(false);
    }
  };

  const handleRemovePlayer = async (playerId: number) => {
    setRemovingPlayerId(playerId);
    setBannerMessage(null);
    try {
      const response = await fetch("/api/admin/roster", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setBannerMessage({
          type: "error",
          text: data?.error ?? "Couldn't remove that player.",
        });
        return;
      }
      applyAdminData(data);
    } catch {
      setBannerMessage({
        type: "error",
        text: "Couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      setRemovingPlayerId(null);
    }
  };

  const persistCoachEmails = async (
    nextEmails: string[],
    options?: { clearDraft?: boolean; successText?: string }
  ) => {
    const coachEmailsToSave = dedupeEmails(nextEmails).join("\n");
    setIsSavingEmails(true);
    setBannerMessage(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachEmails: coachEmailsToSave }),
      });
      const data = await response.json();
      if (!response.ok) {
        setBannerMessage({
          type: "error",
          text: data?.error ?? "Couldn't save the email group.",
        });
        return;
      }
      setCoachEmails(data.coachEmails ?? coachEmailsToSave);
      if (options?.clearDraft) setEmailDraft("");
      setBannerMessage({
        type: "success",
        text: options?.successText ?? "Email group saved.",
      });
    } catch {
      setBannerMessage({
        type: "error",
        text: "Couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      setIsSavingEmails(false);
    }
  };

  const handleSaveCoachEmails = async () => {
    const incoming = parseCoachEmailList(emailDraft);
    if (incoming.length === 0) {
      setBannerMessage({
        type: "error",
        text: "Paste at least one email, then save the group.",
      });
      return;
    }
    await persistCoachEmails([...savedEmailList, ...incoming], {
      clearDraft: true,
      successText: "Email group saved.",
    });
  };

  const handleRemoveCoachEmail = async (email: string) => {
    const next = savedEmailList.filter(
      (item) => item.toLowerCase() !== email.toLowerCase()
    );
    await persistCoachEmails(next, {
      successText: "Removed from the email group.",
    });
  };

  const handleEmailCoaches = () => {
    const emails = savedEmailList;
    if (emails.length === 0) {
      setBannerMessage({
        type: "error",
        text: "Save the email group first. Then Email group sends it to everyone.",
      });
      return;
    }
    const boardUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/`
        : "https://example.com/";
    const subject = formatEmailSubject();
    const body = buildCoachEmailBody(matchLinesForEmail, boardUrl);
    const mailto = `mailto:${emails.join(";")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const handleCopyMatches = async () => {
    const boardUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/`
        : "https://example.com/";
    const body = buildCoachEmailBody(matchLinesForEmail, boardUrl);
    try {
      await navigator.clipboard.writeText(body);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setBannerMessage({
        type: "error",
        text: "Couldn't copy to the clipboard. Select the text manually.",
      });
    }
  };

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
        normalized.courtname ||
        normalized.court ||
        normalized.facilitycourt ||
        "",
      status: normalized.status || normalized.matchstatus || "",
      player: normalized.player || normalized.player1 || normalized.p1 || "",
      opponent:
        normalized.opponent || normalized.player2 || normalized.p2 || "",
      partner:
        normalized.partner ||
        normalized.player1partner ||
        normalized.player3 ||
        "",
      opponentPartner:
        normalized.opponentpartner ||
        normalized.player2partner ||
        normalized.player4 ||
        "",
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
            text: "No rows with a court name were found. Check that the file has a court column.",
          });
        }
      },
      error: (err) => {
        setBannerMessage({
          type: "error",
          text: `Couldn't read that file: ${err.message}`,
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
          text: `Loaded ${mapped.length} sample rows. Nothing is saved until you click "Save to board".`,
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

  const handleSaveCsvToBoard = async () => {
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
          text: data?.error ?? "Couldn't save the order of play.",
          details: Array.isArray(data?.problems) ? data.problems : undefined,
        });
        setIsUploadingCsv(false);
        return;
      }

      applyAdminData(data);

      const unmatchedText =
        Array.isArray(data?.unmatchedCourts) && data.unmatchedCourts.length > 0
          ? ` Skipped these court names because they don't match a court: ${data.unmatchedCourts.join(", ")}.`
          : "";

      setBannerMessage({
        type: "success",
        text: `Updated ${data.updatedCourtsCount} courts on the board.${unmatchedText}`,
      });
      setParsedCsvRows([]);
      setCsvFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setBannerMessage({
        type: "error",
        text: "Couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      setIsUploadingCsv(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {bannerMessage && (
        <div
          role="status"
          className={cn(
            "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium",
            bannerMessage.type === "success"
              ? "border-brand-200 bg-brand-50 text-brand-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          )}
        >
          <div className="flex items-start gap-2">
            {bannerMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <div>
              <span>{bannerMessage.text}</span>
              {bannerMessage.details && bannerMessage.details.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs font-normal">
                  {bannerMessage.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
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

      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Mail className="h-5 w-5 text-brand-600" />
                Email group
                {savedEmailList.length > 0 && (
                  <span className="text-sm font-medium text-slate-500">
                    ({savedEmailList.length})
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Preload the coaches once and save. Anyone new at the desk hits
                Email group and it goes to everyone listed here.
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={handleEmailCoaches}
              aria-label="Email the group"
              className="shrink-0"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email group</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {savedEmailList.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              No emails saved yet. Paste them below, then save the group.
            </p>
          ) : (
            <ul
              className="flex flex-wrap gap-2"
              aria-label="Saved coach emails"
            >
              {savedEmailList.map((email) => (
                <li key={email.toLowerCase()}>
                  <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1 text-sm text-slate-800">
                    <span className="truncate">{email}</span>
                    <button
                      type="button"
                      onClick={() => void handleRemoveCoachEmail(email)}
                      disabled={isSavingEmails}
                      aria-label={`Remove ${email} from the group`}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div>
            <label
              htmlFor="coach-emails"
              className="mb-1 block text-sm font-semibold text-slate-800"
            >
              Add emails
            </label>
            <p className="mb-2 text-xs text-slate-500">
              One address per line, or separated by commas. Saving adds them to
              the group above. Email group opens Outlook or Gmail on this
              laptop.
            </p>
            <textarea
              id="coach-emails"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              rows={3}
              placeholder={"coach1@school.edu\ncoach2@school.edu"}
              aria-label="Coach email addresses to add"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleSaveCoachEmails()}
                disabled={isSavingEmails || !emailDraft.trim()}
                aria-label="Save emails to the group"
              >
                <Save className="h-3.5 w-3.5" />
                <span>
                  {isSavingEmails ? "Saving…" : "Save to group"}
                </span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={mainTab}
        onValueChange={(val) => setMainTab(val as typeof mainTab)}
      >
        <TabsList aria-label="Desk sections">
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="csv">CSV upload</TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="mt-4 space-y-6">
          {/* Add match */}
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Plus className="h-5 w-5 text-brand-600" />
                Add match
              </CardTitle>
              <CardDescription>
                Pick our player, a court, and type the opponent. Save puts it on
                the board in seconds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    htmlFor="add-player-search"
                    className="mb-1 block text-[11px] font-semibold text-slate-600"
                  >
                    Our player
                  </label>
                  <Input
                    id="add-player-search"
                    type="search"
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    placeholder="Type to filter…"
                    aria-label="Filter roster for our player"
                    className="mb-1.5 h-9 text-xs"
                  />
                  <select
                    id="add-player"
                    value={formPlayerId}
                    onChange={(e) => setFormPlayerId(e.target.value)}
                    aria-label="Our player"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">— Pick player —</option>
                    {filteredPlayersForForm.map((p) => {
                      const onCourt = courtNameByPlayerId.get(p.id);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.fullName}
                          {onCourt ? ` (on ${onCourt})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="add-court"
                    className="mb-1 block text-[11px] font-semibold text-slate-600"
                  >
                    Court
                  </label>
                  <select
                    id="add-court"
                    value={formCourtId}
                    onChange={(e) => setFormCourtId(e.target.value)}
                    aria-label="Court"
                    className="mt-0 h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 md:mt-[34px]"
                  >
                    <option value="">— Pick court —</option>
                    {courts.map((c) => {
                      const occupied = isCourtOccupied(c);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {occupied
                            ? ` (busy: ${c.player1?.privacyName ?? c.opponentName ?? c.status})`
                            : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="add-opponent"
                    className="mb-1 block text-[11px] font-semibold text-slate-600"
                  >
                    Opponent
                  </label>
                  <Input
                    id="add-opponent"
                    value={formOpponent}
                    onChange={(e) => setFormOpponent(e.target.value)}
                    placeholder="Jordan Smith"
                    aria-label="Opponent name"
                    className="mt-0 h-10 text-sm md:mt-[34px]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="add-status"
                    className="mb-1 block text-[11px] font-semibold text-slate-600"
                  >
                    Status
                  </label>
                  <select
                    id="add-status"
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as "Warmup" | "In Progress")
                    }
                    aria-label="Match status"
                    className="mt-0 h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 md:mt-[34px]"
                  >
                    {LIVE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormDoubles((v) => !v)}
                  className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
                  aria-pressed={formDoubles}
                >
                  {formDoubles
                    ? "Switch back to singles"
                    : "Add doubles partners"}
                </button>
              </div>

              {formDoubles && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="add-partner-search"
                      className="mb-1 block text-[11px] font-semibold text-slate-600"
                    >
                      Our partner
                    </label>
                    <Input
                      id="add-partner-search"
                      type="search"
                      value={partnerSearch}
                      onChange={(e) => setPartnerSearch(e.target.value)}
                      placeholder="Type to filter…"
                      aria-label="Filter roster for our partner"
                      className="mb-1.5 h-9 text-xs"
                    />
                    <select
                      id="add-partner"
                      value={formPartnerId}
                      onChange={(e) => setFormPartnerId(e.target.value)}
                      aria-label="Our partner"
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value="">— Optional partner —</option>
                      {filteredPartnersForForm.map((p) => {
                        const onCourt = courtNameByPlayerId.get(p.id);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.fullName}
                            {onCourt ? ` (on ${onCourt})` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="add-opp-partner"
                      className="mb-1 block text-[11px] font-semibold text-slate-600"
                    >
                      Opponent&apos;s partner
                    </label>
                    <Input
                      id="add-opp-partner"
                      value={formOpponentPartner}
                      onChange={(e) => setFormOpponentPartner(e.target.value)}
                      placeholder="Ana Perez"
                      aria-label="Opponent partner name"
                      className="mt-0 h-10 text-sm md:mt-[34px]"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void handleSaveMatch()}
                  disabled={isSavingMatch}
                  aria-label="Save match to board"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSavingMatch ? "Saving…" : "Save match"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live matches + email */}
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Our matches right now ({liveMatches.length})
                  </CardTitle>
                  <CardDescription>
                    Change court, flip status, or clear a match off the board.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEmailCoaches}
                    aria-label="Email the group"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email group</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCopyMatches()}
                    aria-label="Copy matches"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{copyDone ? "Copied!" : "Copy matches"}</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {liveMatches.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No matches on the board yet. Add one above.
                </p>
              ) : (
                <ul className="space-y-2" aria-label="Live matches">
                  {liveMatches.map((match) => {
                    const isSaving = savingCourtId === match.id;
                    const line = formatMatchLine({
                      courtName: match.name,
                      status: match.status,
                      playerPrivacyName: match.player1?.privacyName,
                      partnerPrivacyName: match.player3?.privacyName,
                      opponentName: match.opponentName,
                      opponentPartnerName: match.opponentPartnerName,
                    });
                    return (
                      <li
                        key={match.id}
                        className={cn(
                          "flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between",
                          isSaving && "opacity-60"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {line}
                          </p>
                          <Badge
                            variant={
                              match.status === "Warmup"
                                ? "warmup"
                                : "inProgress"
                            }
                            className="mt-1"
                          >
                            {match.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="sr-only" htmlFor={`move-${match.id}`}>
                            Change court for {match.name}
                          </label>
                          <select
                            id={`move-${match.id}`}
                            value=""
                            disabled={isSaving || emptyCourts.length === 0}
                            onChange={(e) => {
                              handleChangeCourt(match, e.target.value);
                              e.target.value = "";
                            }}
                            aria-label={`Change court for ${match.name}`}
                            className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800"
                          >
                            <option value="">Change court…</option>
                            {emptyCourts.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSaving}
                            onClick={() => handleToggleStatus(match)}
                            aria-label={`Change status for ${match.name}`}
                            className="h-8"
                          >
                            {match.status === "Warmup"
                              ? "→ In Progress"
                              : "→ Warmup"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSaving}
                            onClick={() =>
                              void handleCourtAction(match.id, {
                                action: "clear",
                              })
                            }
                            aria-label={`Clear ${match.name}`}
                            className="h-8 text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                          >
                            Clear
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roster" className="mt-4">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Users className="h-5 w-5 text-brand-600" />
                Roster ({players.length})
              </CardTitle>
              <CardDescription>
                Paste names one per line to add our players. Setup is done once
                at the start of the event. Opponents are typed as free text on
                matches — they are not on this list.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label
                  htmlFor="roster-paste"
                  className="mb-1 block text-[11px] font-semibold text-slate-600"
                >
                  Paste names
                </label>
                <textarea
                  id="roster-paste"
                  value={rosterPaste}
                  onChange={(e) => setRosterPaste(e.target.value)}
                  rows={5}
                  placeholder={"Maya Reyes\nLeo Tran\nSam Lee"}
                  aria-label="Paste roster names one per line"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <Button
                  type="button"
                  className="mt-2"
                  onClick={() => void handleAddRoster()}
                  disabled={isSavingRoster || !rosterPaste.trim()}
                  aria-label="Add pasted names to roster"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>
                    {isSavingRoster ? "Adding…" : "Add to roster"}
                  </span>
                </Button>
              </div>

              {players.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No players yet. Paste the team roster above.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {players.map((p) => {
                    const onCourt = courtNameByPlayerId.get(p.id);
                    return (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {p.fullName}
                          </p>
                          <p className="text-xs text-slate-500">
                            Board shows: {p.privacyName}
                            {onCourt ? ` · on ${onCourt}` : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={removingPlayerId === p.id}
                          onClick={() => void handleRemovePlayer(p.id)}
                          aria-label={`Remove ${p.fullName} from roster`}
                          className="text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv" className="mt-4">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <FileSpreadsheet className="h-5 w-5 text-brand-600" />
                    Upload the order of play
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Columns:{" "}
                    <code>court, player, opponent, status, partner, opponentPartner</code>
                    . Player and partner must already be on the roster.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLoadSampleCsvPreview}
                    aria-label="Preview the sample file"
                  >
                    <span>Preview sample</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadSampleCsv}
                    aria-label="Download CSV template"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download template</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-6 text-center transition hover:border-brand-500 hover:bg-brand-50/20">
                <Upload className="h-8 w-8 text-slate-400" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  Choose a CSV file
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileChange}
                  aria-label="Choose a CSV file with the order of play"
                  className="mt-3 block text-xs text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-600 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-700"
                />
              </div>

              {parsedCsvRows.length > 0 && (
                <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Preview ({parsedCsvRows.length} rows from{" "}
                        <span className="text-brand-700">{csvFileName}</span>)
                      </h4>
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
                        onClick={() => void handleSaveCsvToBoard()}
                        disabled={isUploadingCsv}
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>
                          {isUploadingCsv
                            ? "Saving…"
                            : `Save ${parsedCsvRows.length} rows to board`}
                        </span>
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Court</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Our side</th>
                          <th className="px-3 py-2">Opponent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedCsvRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-semibold text-slate-900">
                              {row.courtName}
                            </td>
                            <td className="px-3 py-2">
                              {row.status || "In Progress"}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {[row.player, row.partner]
                                .filter(Boolean)
                                .join(" / ") || "—"}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {[row.opponent, row.opponentPartner]
                                .filter(Boolean)
                                .join(" / ") || "—"}
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
        </TabsContent>
      </Tabs>
    </div>
  );
};
