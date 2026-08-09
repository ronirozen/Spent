"use client";

import { useTranslations } from "next-intl";
import { Wallet } from "lucide-react";
import { CardShell } from "./card-shell";
import { formatCurrency } from "@/lib/formatters";
import type { HomeLiquidStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  data: HomeLiquidStatus;
}

export function LiquidStatusCard({ data }: Props) {
  const t = useTranslations("home");
  const { totalCreditCardDebt } = data;
  
  // As requested, this mimics the "Liquid Status" from Open-Finance
  // where the total credit card debt is presented as a negative liquid status.
  const balance = -totalCreditCardDebt;
  const isNegative = balance < 0;

  return (
    <CardShell label={t("liquidStatus")}>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4 md:py-6">
        <div className="flex items-center justify-center gap-3 w-full">
          <Wallet className={cn("h-7 w-7 opacity-80", isNegative ? "text-[var(--status-over)]" : "text-[var(--status-on-track)]")} />
          <span
            dir="ltr"
            className={cn(
              "font-serif text-4xl md:text-5xl font-bold tabular-nums tracking-tight",
              isNegative ? "text-[var(--status-over)]" : "text-[var(--status-on-track)]"
            )}
          >
            {formatCurrency(balance)}
          </span>
        </div>
        
        {/* Progress bar aesthetic to match Open-Finance */}
        <div className="w-full max-w-sm mt-4">
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div 
              className={cn("h-full rounded-full", isNegative ? "bg-[var(--status-over)]" : "bg-[var(--status-on-track)]")} 
              style={{ width: '100%' }} 
            />
          </div>
          <div className="flex justify-between items-center mt-3 text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[var(--status-on-track)]" />
              {t("liquidFunds")} 0 ₪
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[var(--status-over)]" />
              {t("creditDebt")} {formatCurrency(totalCreditCardDebt)}
            </div>
          </div>
        </div>
      </div>
    </CardShell>
  );
}
