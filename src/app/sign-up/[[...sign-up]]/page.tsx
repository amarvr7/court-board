import { SignUp } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/clerk-config";
import Link from "next/link";

export default function SignUpPage() {
  const clerkReady = isClerkConfigured();

  if (!clerkReady) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Clerk Authentication Setup
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Configure Clerk environment keys in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env.local</code> to enable account registration.
          </p>
          <div className="mt-5">
            <Link
              href="/admin"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Return to /admin
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <SignUp routing="path" path="/sign-up" forceRedirectUrl="/admin" />
    </main>
  );
}
