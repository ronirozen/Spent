"use client";

import { useTranslations, useLocale } from "next-intl";
import { formatCurrency } from "@/lib/formatters";
import type { Locale } from "@/i18n/routing";
import { Subscription } from "@/server/db/queries/subscriptions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SubscriptionList({ subscriptions }: { subscriptions: Subscription[] }) {
  const t = useTranslations("subscriptions");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [removingId, setRemovingId] = useState<number | null>(null);

  const handleRemove = async (id: number) => {
    try {
      setRemovingId(id);
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRemovingId(null);
    }
  };

  if (subscriptions.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {t("noActiveSubscriptions")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("merchant")}</TableHead>
            <TableHead>{t("type")}</TableHead>
            <TableHead>{t("frequency")}</TableHead>
            <TableHead className="text-right">{t("amount")}</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((sub) => (
            <TableRow key={sub.id}>
              <TableCell className="font-medium">
                <div>{sub.name}</div>
                {sub.latestInstallmentNumber != null && sub.latestInstallmentTotal != null && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {t("installmentProgress", { n: sub.latestInstallmentNumber, total: sub.latestInstallmentTotal })}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={sub.type === 'income' ? 'text-green-500' : 'text-red-500'}>
                  {sub.type === 'income' ? t("typeIncome") : t("typeExpense")}
                </Badge>
              </TableCell>
              <TableCell className="capitalize">{sub.frequency === 'monthly' ? t("freqMonthly") : sub.frequency}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatCurrency(sub.amount, sub.currency || "ILS", locale)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-500"
                  onClick={() => handleRemove(sub.id)}
                  disabled={removingId === sub.id}
                  title={t("remove")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
