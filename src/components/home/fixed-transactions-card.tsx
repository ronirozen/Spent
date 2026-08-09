"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Repeat } from "lucide-react";
import { CardShell, CardAction } from "./card-shell";
import { formatCurrency } from "@/lib/formatters";
import type { HomeFixedTransaction } from "@/lib/types";

interface Props {
  items: HomeFixedTransaction[];
}

export function FixedTransactionsCard({ items }: Props) {
  const t = useTranslations("home");
  
  if (items.length === 0) {
    return (
      <CardShell label={t("fixedTransactions") || "תנועות קבועות"}>
        <div className="flex flex-1 items-center justify-center py-6 text-sm text-muted-foreground">
          {t("noFixedTransactionsYet") || "אין תנועות קבועות לחודש זה"}
        </div>
      </CardShell>
    );
  }

  // To match the Open-Finance design, calculate total expenses
  const totalAmount = items
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <CardShell
      label={t("fixedTransactions") || "תנועות קבועות"}
      action={<CardAction href="/subscriptions">{t("manageSubscriptions") || "נהל"}</CardAction>}
    >
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">
          {t("totalFixedExpenses") || "סה״כ הוצאות קבועות"}
        </div>
        <div dir="ltr" className="text-xl tabular-nums font-medium text-[var(--status-over)]">
          −{formatCurrency(totalAmount)}
        </div>
      </div>
      
      <ul className="-mx-2 divide-y divide-border/60">
        {items.map((txn) => (
          <li key={txn.id}>
            <Link
              href="/subscriptions"
              className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/40"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-muted-foreground">
                <Repeat className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {txn.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {txn.frequency === 'monthly' ? (t("frequencyMonthly") || 'חודשי') : 
                   txn.frequency === 'yearly' ? (t("frequencyYearly") || 'שנתי') : 
                   (t("frequencyWeekly") || 'שבועי')}
                </div>
              </div>
              <span
                dir="ltr"
                className={`shrink-0 text-sm tabular-nums ${
                  txn.type === "income"
                    ? "text-[var(--status-on-track)]"
                    : "text-foreground"
                }`}
              >
                {txn.type === "income" ? "+" : "−"}
                {formatCurrency(txn.amount)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}
