import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAdminCourtsAndPlayersData } from "@/lib/queries";
import { isAdminAuthenticated, isAdminPasswordConfigured } from "@/lib/admin-auth";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminLogin, AdminSignOutButton } from "@/components/admin/admin-login";
import { SiteHeader } from "@/components/site/site-header";
import { EventHero } from "@/components/site/event-hero";
import { SiteFooter } from "@/components/site/site-footer";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAuthed = await isAdminAuthenticated();

  if (!isAuthed) {
    return (
      <div id="top" className="flex min-h-screen flex-col">
        <SiteHeader active="admin" />
        <EventHero compact eyebrow="Tournament desk" title="Admin" />
        <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <AdminLogin configured={isAdminPasswordConfigured()} />
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { courts, players } = await getAdminCourtsAndPlayersData();

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <SiteHeader active="admin" />

      <EventHero
        compact
        eyebrow="Tournament desk"
        title="Court control desk"
        subtitle="Edit courts one at a time, or upload the whole order of play from a CSV file."
      >
        <Link
          href="/board"
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark"
        >
          View live board
          <ArrowRight className="h-4 w-4" />
        </Link>
        <AdminSignOutButton />
      </EventHero>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminDashboard initialCourts={courts} initialPlayers={players} />
      </main>

      <SiteFooter />
    </div>
  );
}
