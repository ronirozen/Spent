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

export function SubscriptionList({ subscriptions }: { subscriptions: Subscription[] }) {
  const t = useTranslations("subscriptions");
  const locale = useLocale() as Locale;

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
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((sub) => (
            <TableRow key={sub.id}>
              <TableCell className="font-medium">{sub.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className={sub.type === 'income' ? 'text-green-500' : 'text-red-500'}>
                  {sub.type === 'income' ? t("typeIncome") : t("typeExpense")}
                </Badge>
              </TableCell>
              <TableCell className="capitalize">{sub.frequency === 'monthly' ? t("freqMonthly") : sub.frequency}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatCurrency(sub.amount, sub.currency || "ILS", locale)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
