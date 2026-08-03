"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { Bell, Check, X, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import type { Locale } from "@/i18n/routing";
import type { AppAlert } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function NotificationCenter() {
  const t = useTranslations("notifications");
  const subT = useTranslations("subscriptions");
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery<AppAlert[]>({
    queryKey: ["app-alerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts");
      if (!res.ok) throw new Error("Failed to fetch alerts");
      const data = await res.json();
      return data.alerts || [];
    },
    refetchInterval: 60000, // Poll every minute
  });

  const dismissMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: string }) => {
      const res = await fetch(`/api/alerts/${id}?type=${type}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to dismiss alert");
      return id;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["app-alerts"] });
      const previous = queryClient.getQueryData<AppAlert[]>(["app-alerts"]);
      queryClient.setQueryData<AppAlert[]>(
        ["app-alerts"],
        (old) => old?.filter((a) => a.id !== id) ?? []
      );
      return { previous };
    },
    onError: (err, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["app-alerts"], context.previous);
      }
    },
  });

  const dismissAllMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        alerts.map((a) =>
          fetch(`/api/alerts/${a.id}?type=${a.type}`, { method: "DELETE" })
        )
      );
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["app-alerts"] });
      const previous = queryClient.getQueryData<AppAlert[]>(["app-alerts"]);
      queryClient.setQueryData<AppAlert[]>(["app-alerts"], []);
      return { previous };
    },
    onError: (err, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["app-alerts"], context.previous);
      }
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
        <Bell className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className="absolute right-2 top-2 flex h-2 w-2 items-center justify-center rounded-full bg-emerald-500 animate-pulse" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-88 max-w-[92vw] p-0 shadow-lg border">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{t("title")}</h3>
            {alerts.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
                {alerts.length}
              </Badge>
            )}
          </div>
          {alerts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => dismissAllMutation.mutate()}
            >
              <Check className="mr-1 h-3 w-3" />
              {t("dismissAll")}
            </Button>
          )}
        </div>
        <div className="max-h-[65vh] overflow-y-auto divide-y divide-border/60">
          {alerts.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("empty")}
            </div>
          ) : (
            <div>
              {alerts.map((alert) => {
                if (alert.type === "last_payment") {
                  return (
                    <div
                      key={`last_payment-${alert.id}`}
                      className="flex items-start justify-between gap-3 p-3.5 hover:bg-muted/40 transition-colors group"
                    >
                      <Link
                        href="/installments"
                        className="flex items-start gap-2.5 flex-1 min-w-0"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold truncate">
                              {alert.merchantName}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-1 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                            >
                              {alert.installmentNumber}/{alert.installmentTotal}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t("lastPayment", {
                              amount: formatCurrency(alert.freedAmount, "ILS", locale),
                              n: alert.installmentNumber,
                              total: alert.installmentTotal,
                            })}
                          </p>
                        </div>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                        onClick={() =>
                          dismissMutation.mutate({ id: alert.id, type: alert.type })
                        }
                        title={t("dismiss")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                }

                // Price hike alert
                return (
                  <div
                    key={`price_hike-${alert.id}`}
                    className="flex items-start justify-between gap-3 p-3.5 hover:bg-muted/40 transition-colors group"
                  >
                    <Link
                      href="/subscriptions"
                      className="flex items-start gap-2.5 flex-1 min-w-0"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mt-0.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs font-semibold truncate">
                          {alert.subscriptionName}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {subT("increasedFromTo", {
                            oldPrice: formatCurrency(alert.previousAmount, "ILS", locale),
                            newPrice: formatCurrency(alert.newAmount, "ILS", locale),
                          })}
                        </p>
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                      onClick={() =>
                        dismissMutation.mutate({ id: alert.id, type: alert.type })
                      }
                      title={t("dismiss")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
