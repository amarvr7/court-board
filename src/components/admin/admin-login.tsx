"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const AdminLogin = ({ configured }: { configured: boolean }) => {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password) {
      setErrorMessage("Enter the admin password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data?.error ?? "Incorrect admin password.");
        setIsSubmitting(false);
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy">
        <Shield className="h-6 w-6 text-ball" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-3xl font-bold text-slate-900">Tournament desk sign-in</h2>
      <p className="mt-2 text-sm text-slate-500">
        Admin access is restricted to tournament staff.
      </p>

      {!configured ? (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Admin password isn&apos;t set. Add <code>ADMIN_PASSWORD</code> to the
            server environment.
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label htmlFor="admin-password" className="text-sm font-semibold text-slate-800">
            Password
          </label>
          <div className="relative">
            <Input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMessage(null);
              }}
              disabled={isSubmitting}
              className="h-12 rounded-full pl-5 pr-12 text-base"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:text-slate-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-800"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              "Checking…"
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
};

export const AdminSignOutButton = () => {
  const router = useRouter();
  const handleSignOut = async () => {
    await fetch("/api/auth/admin", { method: "DELETE" });
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="inline-flex items-center rounded-full border border-white/35 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
    >
      Sign out
    </button>
  );
};
