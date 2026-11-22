import { cn } from "@/lib/utils";

export const TennisBall = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={cn("h-5 w-5", className)}
  >
    <circle cx="12" cy="12" r="11" fill="#C1E014" />
    <path
      d="M4.3 4.6c3.5 3.9 3.5 10.9 0 14.8M19.7 4.6c-3.5 3.9-3.5 10.9 0 14.8"
      stroke="#FFFFFF"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

/** Top-down tennis court outline used as a decorative background. */
export const CourtLines = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 780 360"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    aria-hidden="true"
    className={className}
  >
    <rect x="10" y="10" width="760" height="340" />
    <line x1="10" y1="52" x2="770" y2="52" />
    <line x1="10" y1="308" x2="770" y2="308" />
    <line x1="390" y1="0" x2="390" y2="360" strokeWidth="5" />
    <line x1="210" y1="52" x2="210" y2="308" />
    <line x1="570" y1="52" x2="570" y2="308" />
    <line x1="210" y1="180" x2="570" y2="180" />
    <line x1="10" y1="180" x2="24" y2="180" />
    <line x1="756" y1="180" x2="770" y2="180" />
  </svg>
);
