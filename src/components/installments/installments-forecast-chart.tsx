"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";
import type { Locale } from "@/i18n/routing";
import type { InstallmentMonthlyForecast } from "@/lib/types";
import { Sparkles, Calendar, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  forecast: InstallmentMonthlyForecast[];
}

export function InstallmentsForecastChart({ forecast }: Props) {
  const t = useTranslations("installments");
  const locale = useLocale() as Locale;
  const [activeMonthIdx, setActiveMonthIdx] = useState<number | null>(null);

  const hasData = forecast.some((f) => f.committedAmount > 0 || f.freedAmount > 0);

  // Format chart data with localized month names
  const chartData = useMemo(() => {
    return forecast.map((f, i) => {
      let shortName = f.monthLabel;
      let fullName = f.monthLabel;

      if (f.monthKey) {
        const parts = f.monthKey.split("-");
        if (parts.length === 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = new Date(y, m - 1, 1);
          shortName = d.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
            month: "short",
            year: "2-digit",
          });
          fullName = d.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
            month: "long",
            year: "numeric",
          });
        }
      }

      return {
        index: i,
        monthKey: f.monthKey,
        shortName,
        fullName,
        committed: f.committedAmount,
        freed: f.freedAmount,
        activePlansCount: f.activePlansCount,
        endingPlansCount: f.endingPlansCount,
        endingPlans: f.endingPlans,
      };
    });
  }, [forecast, locale]);

  if (!hasData) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Layers className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-sm">{t("noPlans")}</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {t("noPlansDesc")}
          </p>
        </div>
      </div>
    );
  }

  const activePoint = activeMonthIdx != null ? chartData[activeMonthIdx] : chartData[0];

  return (
    <div className="rounded-xl border bg-card p-5 md:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="font-serif text-lg font-semibold tracking-tight">
            {t("forecastTitle")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("forecastDesc")}
          </p>
        </div>

        {activePoint && (
          <div className="flex flex-wrap items-center gap-3 bg-muted/40 px-3.5 py-2 rounded-lg border text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{activePoint.fullName}</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t("committed")}:</span>
              <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(activePoint.committed, "ILS", locale)}
              </span>
            </div>
            {activePoint.freed > 0 && (
              <>
                <div className="h-3 w-px bg-border" />
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="font-mono font-semibold">
                    +{formatCurrency(activePoint.freed, "ILS", locale)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="h-64 sm:h-76 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 12, left: 10, bottom: 4 }}
            barGap={3}
            onMouseMove={(state) => {
              if (state?.activeTooltipIndex != null) {
                const idx = Number(state.activeTooltipIndex);
                if (!isNaN(idx)) {
                  setActiveMonthIdx(idx);
                }
              }
            }}
            onMouseLeave={() => setActiveMonthIdx(null)}
          >
            <defs>
              <linearGradient id="committedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.75} />
              </linearGradient>
              <linearGradient id="freedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.75} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-border/40"
            />
            <XAxis
              dataKey="shortName"
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={6}
            />
            <YAxis
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={55}
              tickFormatter={(v) => `₪${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
            />
            <Tooltip
              cursor={{ fill: "rgba(100, 116, 139, 0.08)" }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-xl border bg-popover/95 p-3.5 shadow-xl backdrop-blur-md text-popover-foreground max-w-xs text-xs space-y-2.5">
                    <div className="flex items-center justify-between border-b pb-2 font-medium">
                      <span className="font-semibold text-sm">{data.fullName}</span>
                      <span className="text-muted-foreground text-[11px]">
                        {t("activePlansCount", { count: data.activePlansCount })}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                          {t("committed")}
                        </span>
                        <span className="font-mono font-medium text-foreground">
                          {formatCurrency(data.committed, "ILS", locale)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          {t("freedBudget")}
                        </span>
                        <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(data.freed, "ILS", locale)}
                        </span>
                      </div>
                    </div>

                    {data.endingPlans && data.endingPlans.length > 0 && (
                      <div className="pt-2 border-t mt-2 space-y-1.5">
                        <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-emerald-500" />
                          {t("plansEnding")} ({data.endingPlans.length}):
                        </div>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {data.endingPlans.map(
                            (ep: {
                              id: string;
                              merchantName: string;
                              monthlyAmount: number;
                            }) => (
                              <div
                                key={ep.id}
                                className="flex justify-between items-center text-[11px] bg-muted/50 px-2 py-1 rounded"
                              >
                                <span className="truncate max-w-[130px] font-medium">
                                  {ep.merchantName}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] py-0 px-1.5 font-mono text-emerald-600 dark:text-emerald-400"
                                >
                                  +{formatCurrency(ep.monthlyAmount, "ILS", locale)}
                                </Badge>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              content={() => (
                <div className="flex items-center justify-end gap-5 pb-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-indigo-500 shadow-sm shrink-0" />
                    <span className="text-muted-foreground font-medium">{t("committed")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-emerald-500 shadow-sm shrink-0" />
                    <span className="text-muted-foreground font-medium">{t("freedBudget")}</span>
                  </div>
                </div>
              )}
            />
            <Bar
              dataKey="committed"
              name="committed"
              fill="url(#committedGradient)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="freed"
              name="freed"
              fill="url(#freedGradient)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
