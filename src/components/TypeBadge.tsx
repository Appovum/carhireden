// ═══════════════════════════════════════════════════════════════════
// TypeBadge — Code | Deal | Cashback
// Visually distinct since they behave differently.
// "Code" = dashed border (cut along dotted line metaphor)
// "Deal" = solid hairline border
// "Cashback" = --money accent
// ═══════════════════════════════════════════════════════════════════

import { CouponType } from "@/types";

interface TypeBadgeProps {
  type: CouponType;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const config: Record<
    CouponType,
    { label: string; className: string }
  > = {
    code: {
      label: "Code",
      className:
        "border border-dashed border-rule-strong text-muted",
    },
    deal: {
      label: "Deal",
      className: "border border-rule text-muted",
    },
    cashback: {
      label: "Cashback",
      className: "border border-money/30 text-money bg-money/5",
    },
  };

  const { label, className } = config[type];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-body font-medium tracking-wide uppercase rounded-sm ${className}`}
    >
      {label}
    </span>
  );
}
