"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import { translateCategoryName } from "@/lib/i18n-data";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryDropdownContent } from "@/components/transactions/category-dropdown-content";
import {
  Plus,
  HelpCircle,
  Check,
  ChevronDown,
  Pencil,
  type LucideIcon,
  CircleDot,
} from "lucide-react";
import {
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
  Sparkles,
  Briefcase,
} from "lucide-react";
import {
  approveTransactionCategory,
  getCategories,
  getCategoryDetail,
  updateBudget,
  updateCategoryBudgetMode,
  updateTransactionCategory,
  type CategoryDetail,
} from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Switch } from "@/components/ui/switch";
import type { Category, TransactionWithCategory } from "@/lib/types";
import type { CategoryChildBreakdown } from "@/lib/api";

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
  briefcase: Briefcase,
};

interface BudgetDetailSheetProps {
  categoryId: number | null;
  from: string;
  to: string;
  subscriptionFilter: "all" | "subscriptions" | "regular";
  onClose: () => void;
}

export function BudgetDetailSheet({
  categoryId,
  from,
  to,
  subscriptionFilter,
  onClose,
}: BudgetDetailSheetProps) {
  const open = categoryId !== null;

  const detailQuery = useQuery({
    enabled: open && categoryId !== null,
    queryKey: ["category-detail", categoryId, from, to, subscriptionFilter],
    queryFn: () => getCategoryDetail(categoryId as number, { from, to, subscriptionFilter }),
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full p-0 sm:max-w-xl! md:max-w-2xl! lg:max-w-[35vw]!"
      >
        {detailQuery.isLoading || !detailQuery.data ? (
          <DetailSkeleton />
        ) : (
          <DetailContent data={detailQuery.data} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function DetailContent({ data }: { data: CategoryDetail }) {
  const t = useTranslations("budgetDetailSheet");
  const tCat = useTranslations("categoriesSeeded");
  const queryClient = useQueryClient();
  const sameKindCategoriesQuery = useQuery({
    queryKey: ["categories", data.category.kind],
    queryFn: () => getCategories(data.category.kind),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["category-detail"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["transactions-summary"] });
  };

  const handleApprove = async (id: number) => {
    await approveTransactionCategory(id);
    invalidate();
  };
  const handleChangeCategory = async (id: number, categoryId: number) => {
    await updateTransactionCategory(id, categoryId);
    invalidate();
  };

  const handleToggleMode = async (checked: boolean) => {
    await updateCategoryBudgetMode(
      data.category.id,
      checked ? "budgeted" : "tracking"
    );
    invalidate();
  };

  const handleSaveBudget = async (amount: number | null) => {
    await updateBudget(data.category.id, amount);
    invalidate();
  };

  const Icon = ICON_MAP[data.category.icon ?? "circle-dot"] ?? CircleDot;
  const iconColor = shade(data.category.color);
  const pct = Math.min(100, Math.round(data.percentSpent));
  const isTracking = data.category.budgetMode === "tracking";

  const chartData = useMemo(
    () =>
      data.dailySpend.map((d) => ({
        day: d.date.slice(8, 10),
        amount: d.amount,
        date: d.date,
      })),
    [data.dailySpend]
  );

  const filteredTransactions = data.transactions;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <SheetHeader
        className="gap-3 p-6 pb-5"
        style={{ background: tint(data.category.color, 0.22) }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background/70"
          >
            <Icon className="h-5 w-5" style={{ color: iconColor }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {data.category.kind === "income"
                ? t("incomeCategory")
                : t("expenseCategory")}
            </div>
            <SheetTitle className="truncate font-serif text-2xl font-normal">
              {translateCategoryName(data.category.name, tCat, undefined)}
            </SheetTitle>
          </div>
          {data.category.kind !== "income" && (
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <span>{t("budget")}</span>
              <Switch
                size="sm"
                checked={!isTracking}
                onCheckedChange={handleToggleMode}
              />
            </label>
          )}
        </div>

        {isTracking ? (
          <div className="mt-2 grid grid-cols-2 gap-3">
            <Stat label={t("spent")} value={formatCurrency(data.spent)} />
            <Stat
              label={t("typicalPerMonth")}
              value={
                data.vsTypical && data.vsTypical.typical > 0
                  ? formatCurrency(data.vsTypical.typical)
                  : "—"
              }
              sublabel={
                data.vsTypical && data.vsTypical.typical > 0
                  ? `${Math.round(data.vsTypical.percentDiff) >= 0 ? "+" : ""}${t("typicalThisMonth", { percent: Math.round(data.vsTypical.percentDiff) })}`
                  : undefined
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <Stat label={t("spent")} value={formatCurrency(data.spent)} />
              <BudgetStat
                amount={data.budget}
                isAuto={data.isAutoBudget}
                onSave={handleSaveBudget}
              />
              <Stat
                label={t("left")}
                value={formatCurrency(Math.max(0, data.budget - data.spent))}
              />
            </div>

            {data.budget > 0 && (
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background/40">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: shade(data.category.color),
                  }}
                />
              </div>
            )}
          </>
        )}
      </SheetHeader>

      <div className="space-y-5 p-6 pt-3">
        {data.category.isParent && data.children && data.children.length > 0 && (
          <ChildrenBreakdownSection
            children={data.children}
            budgetSource={data.budgetSource}
            color={data.category.color}
          />
        )}
        {data.needsReviewCount > 0 && (
          <NeedsReviewSection
            transactions={data.needsReviewTransactions}
            categories={sameKindCategoriesQuery.data ?? []}
            onApprove={handleApprove}
            onChange={handleChangeCategory}
            color={data.category.color}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardLabel>{t("vsLastMonth")}</CardLabel>
            <div className="mt-1 font-serif text-2xl tabular-nums">
              <span dir="ltr">
                {data.prevSpent > 0
                  ? `${data.spent - data.prevSpent >= 0 ? "+" : "-"}${formatCurrency(Math.abs(data.spent - data.prevSpent))}`
                  : "—"}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {data.prevSpent > 0 ? (
                <>
                  {data.prevPeriodLabel}: {formatCurrency(data.prevSpent)}
                  {data.vsLastMonth != null && (
                    <>
                      {" · "}
                      {Math.abs(Math.round(data.vsLastMonth))}%{" "}
                      {data.vsLastMonth < 0 ? t("lower") : t("higher")}
                    </>
                  )}
                </>
              ) : (
                t("noSpendingLastPeriod")
              )}
            </div>
          </Card>

          <Card>
            <CardLabel>{t("avgPerTransaction")}</CardLabel>
            <div className="mt-1 font-serif text-2xl tabular-nums">
              {formatCurrency(data.avgPerTransaction)}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {data.transactionCount === 1 
                ? t("transactionCountOne", { count: data.transactionCount }) 
                : t("transactionCountOther", { count: data.transactionCount })}
            </div>
          </Card>
        </div>

        <Card>
          <CardLabel>{t("dailySpendThisPeriod")}</CardLabel>
          <div className="mt-2 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 0, bottom: 4, left: 0 }}
              >
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <Tooltip
                  cursor={{ fill: tint(data.category.color, 0.1) }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as {
                      day: string;
                      amount: number;
                      date: string;
                    };
                    return (
                      <div className="rounded-md border bg-popover px-2 py-1 text-xs shadow-md">
                        <div className="font-medium">
                          {formatDate(p.date)}
                        </div>
                        <div className="tabular-nums text-muted-foreground">
                          {formatCurrency(p.amount)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.amount > 0
                          ? shade(data.category.color)
                          : tint(data.category.color, 0.18)
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">
              {t("transactions")} · {filteredTransactions.length}
            </h3>
            <div className="flex items-center gap-2">

              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs"
                disabled
                title={t("manualEntryNotAvailable")}
              >
                <Plus className="h-3.5 w-3.5" /> {t("add")}
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-card">
            {filteredTransactions.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {t("noTransactions")}
              </div>
            ) : (
              <ul className="divide-y">
                {filteredTransactions.map((txn) => (
                  <li
                    key={txn.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-sm font-medium">
                        {txn.description}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(txn.date)}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent">
                        <Badge
                          variant="outline"
                          className="border-none p-0"
                          style={{ color: txn.categoryColor ?? undefined }}
                        >
                          {txn.categoryName ? translateCategoryName(txn.categoryName, tCat, txn.categoryLocalName) : t("uncategorized")}
                        </Badge>
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <CategoryDropdownContent 
                        categories={sameKindCategoriesQuery.data ?? []} 
                        onSelect={(categoryId) => handleChangeCategory(txn.id, categoryId)} 
                      />
                    </DropdownMenu>
                    <div className="shrink-0 text-sm font-medium tabular-nums">
                      {formatCurrency(txn.chargedAmount)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChildrenBreakdownSection({
  children,
  budgetSource,
  color,
}: {
  children: CategoryChildBreakdown[];
  budgetSource: "own" | "rollup" | "leaf";
  color: string;
}) {
  const t = useTranslations("budgetDetailSheet");
  const tCat = useTranslations("categoriesSeeded");
  const banner =
    budgetSource === "own"
      ? t("budgetSetOnThisParent")
      : t("budgetRolledUp");
  return (
    <div
      className="space-y-3 rounded-2xl p-4"
      style={{ background: tint(color, 0.12) }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">
          {t("subCategories")} · {children.length}
        </h3>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {budgetSource === "own" ? t("ownBudget") : t("rolledUp")}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{banner}</p>
      <ul className="space-y-1.5">
        {children.map((c) => {
          const pct = Math.min(100, Math.round(c.percentSpent));
          return (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-background/70 px-3 py-2"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: c.color }}
                />
                <span className="truncate text-sm font-medium">{translateCategoryName(c.name, tCat, c.localName)}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums">
                <div className="text-end">
                  <div className="font-medium">{formatCurrency(c.spent)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {c.budget > 0
                      ? t("ofAmount", { amount: formatCurrency(c.budget) })
                      : c.budgetMode === "tracking"
                        ? t("tracking")
                        : t("noBudget")}
                  </div>
                </div>
                {c.budget > 0 && (
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: shade(c.color),
                      }}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NeedsReviewSection({
  transactions,
  categories,
  onApprove,
  onChange,
  color,
}: {
  transactions: TransactionWithCategory[];
  categories: Category[];
  onApprove: (id: number) => void;
  onChange: (id: number, categoryId: number) => void;
  color: string;
}) {
  const t = useTranslations("budgetDetailSheet");
  const tCat = useTranslations("categoriesSeeded");
  return (
    <div
      className="space-y-2 rounded-2xl p-4"
      style={{ background: tint(color, 0.12) }}
    >
      <div className="flex items-center gap-2">
        <HelpCircle
          className="h-4 w-4"
          style={{ color: "var(--status-heads-up)" }}
        />
        <h3 className="text-sm font-medium">
          {t("needsReview")} · {transactions.length}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("aiNotSure")}
      </p>
      <ul className="mt-2 space-y-2">
        {transactions.map((txn) => (
          <li
            key={txn.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-background/70 p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="break-words text-sm font-medium">
                {txn.description}
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {formatDate(txn.date)} · {formatCurrency(txn.chargedAmount)}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent"
                >
                  <Badge
                    variant="outline"
                    className="border-none p-0"
                    style={{
                      color: txn.categoryColor ?? undefined,
                    }}
                  >
                    {txn.categoryName ? translateCategoryName(txn.categoryName, tCat, txn.categoryLocalName) : t("uncategorized")}
                  </Badge>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </DropdownMenuTrigger>
                <CategoryDropdownContent 
                  categories={categories} 
                  onSelect={(categoryId) => onChange(txn.id, categoryId)} 
                />
              </DropdownMenu>
              <Button
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => onApprove(txn.id)}
              >
                <Check className="h-3.5 w-3.5" />
                {t("approve")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-serif text-xl tabular-nums">{value}</div>
      {sublabel && (
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {sublabel}
        </div>
      )}
    </div>
  );
}

function BudgetStat({
  amount,
  isAuto,
  onSave,
}: {
  amount: number;
  isAuto: boolean;
  onSave: (amount: number | null) => Promise<void> | void;
}) {
  const t = useTranslations("budgetDetailSheet");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEdit = () => {
    setDraft(amount > 0 ? Math.round(amount).toString() : "");
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft("");
  };

  const commit = async () => {
    if (saving) return;
    const trimmed = draft.trim();
    let next: number | null;
    if (trimmed === "") {
      next = null;
    } else {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0) {
        cancel();
        return;
      }
      next = parsed === 0 ? null : parsed;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {t("budget")}
      </div>
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className="mt-0.5 w-full rounded-md border border-border bg-background/70 px-1.5 py-0.5 font-serif text-xl tabular-nums outline-none focus:border-foreground/40 disabled:opacity-60"
          placeholder={t("auto")}
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="group mt-0.5 flex w-full cursor-pointer items-center gap-1.5 rounded-md text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Edit budget amount"
        >
          <span className="font-serif text-xl tabular-nums">
            {amount > 0 ? formatCurrency(amount) : "—"}
          </span>
          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        </button>
      )}
      {!editing && isAuto && amount > 0 && (
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {t("auto")}
        </div>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-4">{children}</div>;
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </div>
  );
}

function tint(hex: string, opacity: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function shade(hex: string): string {
  const { r, g, b } = parseHex(hex);
  const factor = 0.78;
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

