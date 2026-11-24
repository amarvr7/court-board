import React from "react";
import { isBoardAuthenticated, isEventPinConfigured } from "@/lib/board-auth";
import { getBoardCourtsData } from "@/lib/queries";
import { PinGate } from "@/components/board/pin-gate";
import { CourtBoard } from "@/components/board/court-board";
import { SiteHeader } from "@/components/site/site-header";
import { EventHero } from "@/components/site/event-hero";
import { SiteFooter } from "@/components/site/site-footer";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const isPinVerified = await isBoardAuthenticated();

  const boardData = isPinVerified ? await getBoardCourtsData() : null;
  const unlocked = isPinVerified && boardData;

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <SiteHeader active="board" />

      <EventHero
        compact
        eyebrow="Live board"
        title="Order of play — live courts"
        subtitle={
          unlocked
            ? "Search a player to jump to their court. Updates every 20 seconds."
            : "Enter the event PIN to see live court assignments."
        }
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {!unlocked ? (
          <PinGate configured={isEventPinConfigured()} />
        ) : (
          <CourtBoard
            initialCourts={boardData.courts}
            initialFetchedAt={boardData.fetchedAt}
          />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
