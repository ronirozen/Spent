import { headers } from "next/headers";
import { getDb } from "@/server/db/index";
import { getSubscriptions, getSubscriptionAlerts } from "@/server/db/queries/subscriptions";
import { SubscriptionList } from "@/components/subscriptions/subscription-list";
import { AppShell, PageHeader } from "@/components/layout/app-shell";
import { SyncButton } from "@/components/dashboard/sync-button";

import { getTranslations, getLocale } from "next-intl/server";
import { formatCurrency } from "@/lib/formatters";
import type { Locale } from "@/i18n/routing";

async function getWorkspaceId(): Promise<number> {
  const headersList = await headers();
  const idStr = headersList.get("x-workspace-id");
  if (idStr) {
     return Number(idStr);
  }
  const row = getDb()
    .prepare("SELECT id FROM workspaces ORDER BY id LIMIT 1")
    .get() as { id: number } | undefined;
  if (!row) throw new Error("No workspace");
  return row.id;
}

export default async function SubscriptionsPage() {
  const t = await getTranslations("subscriptions");
  const locale = (await getLocale()) as Locale;
  
  const workspaceId = await getWorkspaceId();
  const subscriptions = getSubscriptions(workspaceId);

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const totalExpense = activeSubscriptions
    .filter(s => s.type === 'expense')
    .reduce((sum, s) => sum + s.amount, 0);
  const totalIncome = activeSubscriptions
    .filter(s => s.type === 'income')
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <AppShell>
      <PageHeader 
        title={t("pageTitle")}
        meta={new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date())}
        actions={<SyncButton />}
      />
      <div className="p-4 md:p-6 lg:p-8 space-y-6">

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4 shadow-sm bg-card">
          <h3 className="text-sm font-medium text-muted-foreground">{t("fixedMonthlyExpenses")}</h3>
          <p className="mt-2 text-2xl font-bold text-red-500 tabular-nums">
            {formatCurrency(totalExpense, "ILS", locale)}
          </p>
        </div>
        <div className="rounded-lg border p-4 shadow-sm bg-card">
          <h3 className="text-sm font-medium text-muted-foreground">{t("recurringMonthlyIncome")}</h3>
          <p className="mt-2 text-2xl font-bold text-green-500 tabular-nums">
            {formatCurrency(totalIncome, "ILS", locale)}
          </p>
        </div>
        <div className="rounded-lg border p-4 shadow-sm bg-card">
          <h3 className="text-sm font-medium text-muted-foreground">{t("disposableIncome")}</h3>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {formatCurrency(totalIncome - totalExpense, "ILS", locale)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border shadow-sm bg-card">
        <SubscriptionList subscriptions={activeSubscriptions} />
      </div>
      </div>
    </AppShell>
  );
}
