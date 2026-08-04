import { headers } from "next/headers";
import { getDb } from "@/server/db/index";
import { getInstallmentsOverview } from "@/server/db/queries/installments";
import { InstallmentsKpiCards } from "@/components/installments/installments-kpi";
import { InstallmentsForecastChart } from "@/components/installments/installments-forecast-chart";
import { PaymentPlansList } from "@/components/installments/payment-plans-list";
import { AppShell, PageHeader } from "@/components/layout/app-shell";
import { SyncButton } from "@/components/dashboard/sync-button";
import { getTranslations, getLocale } from "next-intl/server";
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

export default async function InstallmentsPage() {
  const t = await getTranslations("installments");
  const locale = (await getLocale()) as Locale;

  const workspaceId = await getWorkspaceId();
  const overview = getInstallmentsOverview(workspaceId);

  return (
    <AppShell>
      <PageHeader
        title={t("pageTitle")}
        meta={new Intl.DateTimeFormat(locale, {
          month: "long",
          year: "numeric",
        }).format(new Date())}
        actions={<SyncButton />}
      />

      <div className="p-3.5 sm:p-5 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* KPI Cards */}
        <InstallmentsKpiCards summary={overview.summary} />

        {/* 12-Month Forecast Bar Chart */}
        <InstallmentsForecastChart forecast={overview.forecast} />

        {/* Payment Plans List with Tabs and Filter */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-semibold tracking-tight">
                {t("activePlans")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("subtitle")}
              </p>
            </div>
          </div>

          <PaymentPlansList plans={overview.plans} />
        </div>
      </div>
    </AppShell>
  );
}
