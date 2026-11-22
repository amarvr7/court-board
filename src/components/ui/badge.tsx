import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-emerald-600 text-white",
        secondary:
          "border-transparent bg-ice text-slate-500",
        destructive:
          "border-transparent bg-rose-600 text-white",
        outline: "text-slate-700 border-slate-300",
        warmup:
          "border-amber-300 bg-amber-100 text-amber-900",
        inProgress:
          "border-transparent bg-ball text-ink",
        open:
          "border-transparent bg-chip text-slate-500",
        maintenance:
          "border-rose-300 bg-rose-100 text-rose-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
};

export { badgeVariants };
