import { SignIn } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/clerk-config";
import Link from "next/link";

export default function SignInPage() {
  const clerkReady = isClerkConfigured();

  if (!clerkReady) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Clerk Authentication Setup
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Add your <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">CLERK_SECRET_KEY</code> to{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env.local</code> to enable Clerk SSO login.
          </p>
          <div className="mt-5 flex gap-3">
            <Link
              href="/admin"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Continue to /admin
            </Link>
            <Link
              href="/board"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Go to /board
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <SignIn routing="path" path="/sign-in" forceRedirectUrl="/admin" />
    </main>
  );
}
