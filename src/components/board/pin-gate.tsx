"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const PinGate = ({ configured = true }: { configured?: boolean }) => {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const submitPinCode = async (pinCode: string) => {
    if (pinCode.length !== 4) {
      setErrorMessage("Please enter all 4 digits of the Team PIN.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/board-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data?.error ?? "That PIN isn't right.");
        setIsSubmitting(false);
        // Clear the boxes so the next try starts fresh.
        setDigits(["", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 0);
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage("Network error while verifying PIN. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleanDigit = value.replace(/\D/g, "").slice(-1);
    const updatedDigits = [...digits];
    updatedDigits[index] = cleanDigit;
    setDigits(updatedDigits);
    setErrorMessage(null);

    if (cleanDigit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    const joined = updatedDigits.join("");
    if (joined.length === 4 && updatedDigits.every((d) => d.length === 1)) {
      void submitPinCode(joined);
    }
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);
    if (!pasted) return;

    const updatedDigits = ["", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      updatedDigits[i] = pasted[i];
    }
    setDigits(updatedDigits);

    if (pasted.length === 4) {
      void submitPinCode(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitPinCode(digits.join(""));
  };

  if (!configured) {
    return (
      <div className="flex items-center justify-center px-0 py-6 sm:py-10">
        <Card className="w-full max-w-md rounded-3xl border-slate-200 bg-white shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <CardTitle className="font-display text-3xl font-bold uppercase text-slate-900">
              Board not open yet
            </CardTitle>
            <CardDescription className="text-sm text-slate-600">
              The Team PIN hasn&apos;t been set. Please check with the desk.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-0 py-6 sm:py-10">
      <Card className="w-full max-w-md rounded-3xl border-slate-200 bg-white shadow-lg">
        <CardHeader className="space-y-3 text-center pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-ball">
            <Lock className="h-7 w-7" aria-hidden="true" />
          </div>
          <CardTitle className="font-display text-3xl font-bold uppercase text-slate-900">
            Enter Team PIN
          </CardTitle>
          <CardDescription className="text-sm text-slate-600">
            Enter the 4-digit Team PIN from the desk to see live court assignments.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div
              className="flex items-center justify-center gap-3"
              role="group"
              aria-label="4-digit Team PIN input"
            >
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  aria-label={`PIN Digit ${index + 1}`}
                  tabIndex={0}
                  autoFocus={index === 0}
                  disabled={isSubmitting}
                  className="h-16 w-14 rounded-2xl border-2 border-slate-300 bg-slate-50 text-center font-display text-3xl font-bold text-slate-900 transition-all focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:opacity-50"
                />
              ))}
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || digits.join("").length !== 4}
              className="w-full font-semibold"
              aria-label="Unlock Live Court Board"
            >
              {isSubmitting ? (
                "Checking PIN…"
              ) : (
                <>
                  <span>Unlock board</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-brand-600" />
              <span>Ask the desk if you don&apos;t have the Team PIN.</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
