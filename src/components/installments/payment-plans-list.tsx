"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Search,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Sparkles,
  Calendar,
  Layers,
  History,
  CheckCircle2,
  AlertCircle,
  ShoppingBasket,
  UtensilsCrossed,
  TramFront,
  ShoppingBag,
  Ticket,
  HeartPulse,
  GraduationCap,
  Receipt,
  RefreshCw,
  Plane,
  Banknote,
  ArrowLeftRight,
  Shield,
  Home,
  CircleDot,
  Coffee,
  PawPrint,
  Gift,
  Baby,
  Briefcase,
  TrendingUp,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { translateCategoryName } from "@/lib/i18n-data";
import type { Locale } from "@/i18n/routing";
import type { PaymentPlan } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ICON_MAP: Record<string, LucideIcon> = {
  "shopping-basket": ShoppingBasket,
  "utensils-crossed": UtensilsCrossed,
  "tram-front": TramFront,
  "shopping-bag": ShoppingBag,
  ticket: Ticket,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  receipt: Receipt,
  "refresh-cw": RefreshCw,
  plane: Plane,
  banknote: Banknote,
  "arrow-left-right": ArrowLeftRight,
  shield: Shield,
  home: Home,
  sparkles: Sparkles,
  "circle-dot": CircleDot,
  coffee: Coffee,
  "paw-print": PawPrint,
  gift: Gift,
  baby: Baby,
  briefcase: Briefcase,
  "trending-up": TrendingUp,
  "rotate-ccw": RotateCcw,
};

interface Props {
  plans: PaymentPlan[];
}

type TabKey = "active" | "ending_soon" | "completed" | "all";

export function PaymentPlansList({ plans }: Props) {
  const t = useTranslations("installments");
  const tCat = useTranslations("categoriesSeeded");
  const locale = useLocale() as Locale;

  const [currentTab, setCurrentTab] = useState<TabKey>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const activePlans = useMemo(
    () => plans.filter((p) => p.status !== "completed"),
    [plans]
  );
  const endingSoonPlans = useMemo(
    () => plans.filter((p) => p.status === "last_payment" || p.status === "ending_soon"),
    [plans]
  );
  const completedPlans = useMemo(
    () => plans.filter((p) => p.status === "completed"),
    [plans]
  );

  const filteredPlans = useMemo(() => {
    let list: PaymentPlan[] = [];
    if (currentTab === "active") list = activePlans;
    else if (currentTab === "ending_soon") list = endingSoonPlans;
    else if (currentTab === "completed") list = completedPlans;
    else list = plans;

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (p) =>
        p.merchantName.toLowerCase().includes(q) ||
        p.rawDescription.toLowerCase().includes(q) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
        (p.categoryLocalName && p.categoryLocalName.toLowerCase().includes(q)) ||
        p.accountNumber.includes(q)
    );
  }, [plans, activePlans, endingSoonPlans, completedPlans, currentTab, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedPlanId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      {/* Header Controls: Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-lg bg-muted/60 p-1 text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => setCurrentTab("active")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1.5 font-medium shrink-0 whitespace-nowrap transition-all ${
              currentTab === "active"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{t("activeTab")}</span>
            <Badge
              variant="secondary"
              className="px-1 py-0 text-[10px] font-mono leading-none"
            >
              {activePlans.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab("ending_soon")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1.5 font-medium shrink-0 whitespace-nowrap transition-all ${
              currentTab === "ending_soon"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{t("endingSoonTab")}</span>
            <Badge
              variant="secondary"
              className="px-1 py-0 text-[10px] font-mono leading-none text-amber-600 dark:text-amber-400"
            >
              {endingSoonPlans.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab("completed")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1.5 font-medium shrink-0 whitespace-nowrap transition-all ${
              currentTab === "completed"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{t("completedTab")}</span>
            <Badge
              variant="secondary"
              className="px-1 py-0 text-[10px] font-mono leading-none"
            >
              {completedPlans.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab("all")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1.5 font-medium shrink-0 whitespace-nowrap transition-all ${
              currentTab === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{t("allPlans")}</span>
            <Badge
              variant="secondary"
              className="px-1 py-0 text-[10px] font-mono leading-none"
            >
              {plans.length}
            </Badge>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Plan List Content */}
      {filteredPlans.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Layers className="h-9 w-9 text-muted-foreground/40 mx-auto mb-2" />
          <h4 className="text-sm font-semibold">{t("noPlans")}</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {t("noPlansDesc")}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredPlans.map((plan) => {
            const isExpanded = expandedPlanId === plan.id;
            const progressPercent = Math.min(
              100,
              Math.round((plan.latestInstallmentNumber / plan.installmentTotal) * 100)
            );
            const CategoryIcon = plan.categoryIcon ? ICON_MAP[plan.categoryIcon] ?? CircleDot : CircleDot;
            const displayedCategoryName = plan.categoryName
              ? translateCategoryName(plan.categoryName, tCat, plan.categoryLocalName)
              : null;

            return (
              <div
                key={plan.id}
                className="rounded-xl border bg-card shadow-sm transition-all hover:border-border/80 overflow-hidden"
              >
                {/* Main Card Header / Row */}
                <div className="p-4 sm:p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  {/* Left Column: Merchant info, Category, Account */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-sm sm:text-base truncate">
                        {plan.merchantName}
                      </h4>

                      {/* Status Badge */}
                      {plan.status === "last_payment" && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium flex items-center gap-1 animate-pulse"
                        >
                          <Sparkles className="h-3 w-3" />
                          {t("statusLastPayment")}
                        </Badge>
                      )}
                      {plan.status === "ending_soon" && (
                        <Badge
                          variant="outline"
                          className="border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-medium flex items-center gap-1"
                        >
                          <AlertCircle className="h-3 w-3" />
                          {t("statusEndingSoon")}
                        </Badge>
                      )}
                      {plan.status === "completed" && (
                        <Badge
                          variant="secondary"
                          className="text-[11px] text-muted-foreground flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {t("statusCompleted")}
                        </Badge>
                      )}

                      {/* Category Tag */}
                      {displayedCategoryName && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: plan.categoryColor
                              ? `${plan.categoryColor}20`
                              : "hsl(var(--muted))",
                            color: plan.categoryColor || "currentColor",
                          }}
                        >
                          <CategoryIcon className="h-3 w-3 shrink-0" />
                          <span>{displayedCategoryName}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {plan.accountLabel || `${plan.provider} ···${plan.accountNumber.slice(-4)}`}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{t("endDate")}:</span>
                        <span className="font-medium text-foreground">
                          {formatDate(plan.expectedEndDate)}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Middle Column: Progress Bar & Installments Ratio */}
                  <div className="w-full md:w-56 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">
                        {t("installmentOf", {
                          n: plan.latestInstallmentNumber,
                          total: plan.installmentTotal,
                        })}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums font-mono">
                        {progressPercent}%
                      </span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          plan.status === "completed"
                            ? "bg-muted-foreground/60"
                            : plan.status === "last_payment"
                            ? "bg-emerald-500"
                            : "bg-indigo-500"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                      {plan.status === "completed"
                        ? t("planCompleted")
                        : t("paymentsRemaining", { count: plan.remainingInstallments })}
                    </div>
                  </div>

                  {/* Right Column: Financials & Action */}
                  <div className="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-start md:text-end space-y-0.5">
                      <div className="text-xs text-muted-foreground">{t("monthly")}</div>
                      <div className="font-serif text-base font-bold text-foreground tabular-nums">
                        {formatCurrency(plan.monthlyAmount, "ILS", locale)}
                      </div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        {t("remaining")}: {formatCurrency(plan.remainingAmount, "ILS", locale)}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(plan.id)}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                    >
                      <History className="h-3.5 w-3.5" />
                      <span>{isExpanded ? t("hideTransactions") : t("viewTransactions")}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded Transaction History Drawer */}
                {isExpanded && (
                  <div className="border-t bg-muted/25 p-4 sm:p-5">
                    <div className="mb-2.5 text-xs font-medium text-muted-foreground flex flex-wrap items-center justify-between gap-2">
                      <span>{t("historyTitle", { count: plan.transactions.length })}</span>
                      <span className="font-semibold text-foreground">
                        {t("totalPlan", { amount: formatCurrency(plan.totalPlanAmount, "ILS", locale) })}
                      </span>
                    </div>

                    <div className="divide-y divide-border/60 rounded-lg border bg-card text-xs overflow-hidden">
                      {plan.transactions.map((txn, idx) => (
                        <div
                          key={txn.id || idx}
                          className="flex items-center justify-between p-3 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="secondary"
                              className="font-mono text-[10px] py-0.5 px-2"
                            >
                              {txn.installmentNumber && txn.installmentTotal
                                ? `${txn.installmentNumber}/${txn.installmentTotal}`
                                : `#${idx + 1}`}
                            </Badge>
                            <div className="space-y-0.5">
                              <span className="font-medium text-foreground">
                                {txn.description}
                              </span>
                              <div className="text-[11px] text-muted-foreground">
                                {formatDate(txn.date)}
                                {txn.memo ? ` • ${txn.memo}` : ""}
                              </div>
                            </div>
                          </div>

                          <div className="font-mono font-semibold text-foreground tabular-nums">
                            {formatCurrency(Math.abs(txn.chargedAmount), "ILS", locale)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
