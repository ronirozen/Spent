"use client";

import { useTranslations, useLocale } from "next-intl";
import { CreditCard, CalendarCheck, Target, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { Locale } from "@/i18n/routing";
import type { InstallmentsOverview } from "@/lib/types";

interface Props {
  summary: InstallmentsOverview["summary"];
}

export function InstallmentsKpiCards({ summary }: Props) {
  const t = useTranslations("installments");
  const locale = useLocale() as Locale;

  const formattedPayoffDate = summary.payoffDate
    ? new Date(summary.payoffDate).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Monthly Burden */}
      <div className="relative overflow-hidden rounded-xl border bg-card p-3.5 sm:p-5 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
            {t("monthlyBurden")}
          </span>
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </div>
        <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
          <span className="font-serif text-lg sm:text-2xl font-bold tracking-tight tabular-nums truncate">
            {formatCurrency(summary.monthlyBurden, "ILS", locale)}
          </span>
          <span className="text-[11px] sm:text-xs text-muted-foreground shrink-0">{t("perMonth")}</span>
        </div>
        <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground truncate">
          {t("activePlansCount", { count: summary.activePlansCount })}
        </p>
      </div>

      {/* Remaining Balance */}
      <div className="relative overflow-hidden rounded-xl border bg-card p-3.5 sm:p-5 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
            {t("totalRemainingBalance")}
          </span>
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <CalendarCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </div>
        <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
          <span className="font-serif text-lg sm:text-2xl font-bold tracking-tight tabular-nums truncate">
            {formatCurrency(summary.totalRemainingBalance, "ILS", locale)}
          </span>
        </div>
        <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground truncate">
          {t("totalRemainingBalanceDesc")}
        </p>
      </div>

      {/* Freeing Up Next Month */}
      <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-3.5 sm:p-5 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-300 truncate">
            {t("freeingNextMonth")}
          </span>
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </div>
        <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
          <span className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
            {formatCurrency(summary.freeingUpNextMonth, "ILS", locale)}
          </span>
          <span className="text-[11px] sm:text-xs text-emerald-700/80 dark:text-emerald-300/80 shrink-0">{t("perMonth")}</span>
        </div>
        <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground truncate">
          {summary.endingSoonCount > 0
            ? t("plansEndingSoonCount", { count: summary.endingSoonCount })
            : t("freeingNextMonthDesc")}
        </p>
      </div>

      {/* Payoff Horizon */}
      <div className="relative overflow-hidden rounded-xl border bg-card p-3.5 sm:p-5 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
            {t("payoffHorizon")}
          </span>
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </div>
        <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
          <span className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-foreground capitalize truncate">
            {formattedPayoffDate || t("noActiveDebt")}
          </span>
        </div>
        <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground truncate">
          {summary.monthsToPayoff > 0
            ? t("monthsToPayoffCount", { count: summary.monthsToPayoff })
            : t("payoffHorizonDesc")}
        </p>
      </div>
    </div>
  );
}
