import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deskSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateDeskSettings } from "@/lib/queries";
import {
  adminUnauthorizedResponse,
  isAdminAuthenticated,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const GET = async () => {
  if (!(await isAdminAuthenticated())) return adminUnauthorizedResponse();

  try {
    const settings = await getOrCreateDeskSettings();
    return NextResponse.json(settings, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Settings get error:", error);
    return NextResponse.json(
      { error: "Couldn't load desk settings." },
      { status: 500 }
    );
  }
};

export const PUT = async (request: NextRequest) => {
  if (!(await isAdminAuthenticated())) return adminUnauthorizedResponse();

  try {
    const body = await request.json();
    const coachEmails =
      typeof body?.coachEmails === "string" ? body.coachEmails.trim() : "";

    const existing = await db.select().from(deskSettings).limit(1);
    if (existing[0]) {
      await db
        .update(deskSettings)
        .set({ coachEmails, updatedAt: new Date() })
        .where(eq(deskSettings.id, existing[0].id));
    } else {
      await db.insert(deskSettings).values({ coachEmails });
    }

    return NextResponse.json({ coachEmails });
  } catch (error) {
    console.error("Settings save error:", error);
    return NextResponse.json(
      { error: "Couldn't save coach emails." },
      { status: 500 }
    );
  }
};
