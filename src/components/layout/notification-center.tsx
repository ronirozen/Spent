"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { Bell, Check, X } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { Locale } from "@/i18n/routing";
import type { SubscriptionAlert } from "@/server/db/queries/subscriptions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function NotificationCenter() {
  const t = useTranslations("notifications");
  const subT = useTranslations("subscriptions");
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery<SubscriptionAlert[]>({
    queryKey: ["subscription-alerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts");
      if (!res.ok) throw new Error("Failed to fetch alerts");
      const data = await res.json();
      return data.alerts || [];
    },
    refetchInterval: 60000, // Poll every minute
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to dismiss alert");
      return alertId;
    },
    onMutate: async (dismissedId) => {
      await queryClient.cancelQueries({ queryKey: ["subscription-alerts"] });
      const previous = queryClient.getQueryData<SubscriptionAlert[]>(["subscription-alerts"]);
      queryClient.setQueryData<SubscriptionAlert[]>(
        ["subscription-alerts"],
        (old) => old?.filter(a => a.id !== dismissedId) ?? []
      );
      return { previous };
    },
    onError: (err, dismissedId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["subscription-alerts"], context.previous);
      }
    },
  });

  const dismissAllMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(alerts.map(a => fetch(`/api/alerts/${a.id}`, { method: "DELETE" })));
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["subscription-alerts"] });
      const previous = queryClient.getQueryData<SubscriptionAlert[]>(["subscription-alerts"]);
      queryClient.setQueryData<SubscriptionAlert[]>(["subscription-alerts"], []);
      return { previous };
    },
    onError: (err, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["subscription-alerts"], context.previous);
      }
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
        <Bell className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className="absolute right-2 top-2 flex h-2 w-2 items-center justify-center rounded-full bg-destructive" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[90vw] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">{t("title")}</h3>
          {alerts.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={() => dismissAllMutation.mutate()}
            >
              <Check className="mr-1 h-3 w-3" />
              {t("dismissAll")}
            </Button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("empty")}
            </div>
          ) : (
            <div className="flex flex-col">
              {alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="flex items-start justify-between gap-3 border-b p-4 last:border-b-0 hover:bg-muted/50"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">{alert.subscriptionName}</span>
                    <p className="text-xs text-muted-foreground">
                      {subT("increasedFromTo", {
                        oldPrice: formatCurrency(alert.previousAmount, "ILS", locale),
                        newPrice: formatCurrency(alert.newAmount, "ILS", locale)
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground"
                    onClick={() => dismissMutation.mutate(alert.id)}
                    title={t("dismiss")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
