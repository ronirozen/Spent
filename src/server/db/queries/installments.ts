import "server-only";

import { getDb } from "../index";
import { cleanMerchantDescription } from "../../lib/installments-extractor";
import type {
  InstallmentMonthlyForecast,
  InstallmentPlanStatus,
  InstallmentsOverview,
  PaymentPlan,
  PaymentPlanTransaction,
} from "@/lib/types";

interface DbTransactionRow {
  id: number;
  account_number: string;
  account_label: string | null;
  date: string;
  processed_date: string | null;
  charged_amount: number;
  charged_currency: string | null;
  description: string;
  memo: string | null;
  type: string;
  installment_number: number | null;
  installment_total: number | null;
  provider: string;
  category_id: number | null;
  category_name: string | null;
  category_local_name: string | null;
  category_color: string | null;
  category_icon: string | null;
}

/**
 * Normalizes date to add N months.
 */
function addMonths(dateStr: string, monthsToAdd: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const currentMonth = d.getMonth();
  d.setMonth(currentMonth + monthsToAdd);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns formatted month key YYYY-MM and human label.
 */
function getMonthInfo(date: Date): { monthKey: string; monthLabel: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthLabel = date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  return { monthKey, monthLabel };
}

export function getInstallmentsOverview(workspaceId: number): InstallmentsOverview {
  const db = getDb();

  const rows = db.prepare(`
    SELECT 
      t.id,
      t.account_number,
      bc.label as account_label,
      t.date,
      t.processed_date,
      t.charged_amount,
      t.charged_currency,
      t.description,
      t.memo,
      t.type,
      t.installment_number,
      t.installment_total,
      t.provider,
      c.id as category_id,
      c.name as category_name,
      c.local_name as category_local_name,
      c.color as category_color,
      c.icon as category_icon
    FROM transactions t
    LEFT JOIN bank_credentials bc ON t.credential_id = bc.id
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.workspace_id = ?
      AND t.is_excluded = 0
      AND (
        t.type = 'installments' 
        OR (t.installment_total IS NOT NULL AND t.installment_total > 1)
      )
    ORDER BY t.date ASC, t.installment_number ASC
  `).all(workspaceId) as DbTransactionRow[];

  // Group by clean merchant + account + total installments
  const plansMap = new Map<string, {
    planKey: string;
    cleanMerchant: string;
    rawDescription: string;
    accountNumber: string;
    accountLabel: string | null;
    provider: string;
    categoryId: number | null;
    categoryName: string | null;
    categoryLocalName: string | null;
    categoryColor: string | null;
    categoryIcon: string | null;
    installmentTotal: number;
    txns: DbTransactionRow[];
  }>();

  for (const row of rows) {
    const total = row.installment_total || 1;
    if (total <= 1) continue;

    const cleanMerchant = cleanMerchantDescription(row.description) || row.description;
    const normKey = cleanMerchant.toLowerCase().trim();
    const groupKey = `${normKey}|${row.account_number}|${total}`;

    let planGroup = plansMap.get(groupKey);
    if (!planGroup) {
      planGroup = {
        planKey: groupKey,
        cleanMerchant,
        rawDescription: row.description,
        accountNumber: row.account_number,
        accountLabel: row.account_label,
        provider: row.provider,
        categoryId: row.category_id,
        categoryName: row.category_name,
        categoryLocalName: row.category_local_name,
        categoryColor: row.category_color,
        categoryIcon: row.category_icon,
        installmentTotal: total,
        txns: [],
      };
      plansMap.set(groupKey, planGroup);
    }

    // Keep category from latest transaction if available
    if (row.category_id != null) {
      planGroup.categoryId = row.category_id;
      planGroup.categoryName = row.category_name;
      planGroup.categoryLocalName = row.category_local_name;
      planGroup.categoryColor = row.category_color;
      planGroup.categoryIcon = row.category_icon;
    }

    planGroup.txns.push(row);
  }

  const plans: PaymentPlan[] = [];

  for (const group of plansMap.values()) {
    const txns: PaymentPlanTransaction[] = group.txns.map((t) => ({
      id: t.id,
      date: t.date,
      processedDate: t.processed_date,
      chargedAmount: t.charged_amount,
      chargedCurrency: t.charged_currency,
      installmentNumber: t.installment_number,
      installmentTotal: t.installment_total,
      description: t.description,
      memo: t.memo,
    }));

    // Sort txns by date descending for latest info
    const sortedDesc = [...txns].sort((a, b) => b.date.localeCompare(a.date));
    const latestTxn = sortedDesc[0];
    const earliestTxn = sortedDesc[sortedDesc.length - 1];

    const installmentNumbers = txns
      .map((t) => t.installmentNumber)
      .filter((n): n is number => n != null && n > 0);

    const latestTxnRecordedNumber =
      installmentNumbers.length > 0
        ? Math.min(group.installmentTotal, Math.max(...installmentNumbers))
        : Math.min(group.installmentTotal, txns.length);

    const latestTxnDate = new Date(latestTxn.date);
    const now = new Date();
    const monthDiffFromLatest =
      (now.getFullYear() - latestTxnDate.getFullYear()) * 12 +
      (now.getMonth() - latestTxnDate.getMonth());

    // Current month installment number based on calendar progression
    const currentInstallmentNumber = Math.min(
      group.installmentTotal,
      latestTxnRecordedNumber + Math.max(0, monthDiffFromLatest)
    );

    // Monthly amount is typical absolute charged amount
    const monthlyAmount = Math.abs(latestTxn?.chargedAmount || 0);
    const totalPlanAmount = Math.round(monthlyAmount * group.installmentTotal * 100) / 100;
    const paidAmount = Math.round(monthlyAmount * currentInstallmentNumber * 100) / 100;
    const remainingInstallments = Math.max(0, group.installmentTotal - currentInstallmentNumber);
    const remainingAmount = Math.max(0, Math.round(monthlyAmount * remainingInstallments * 100) / 100);

    const expectedEndDate = addMonths(
      latestTxn.date,
      Math.max(0, group.installmentTotal - latestTxnRecordedNumber)
    );

    let status: InstallmentPlanStatus = "active";
    if (latestTxnRecordedNumber >= group.installmentTotal && monthDiffFromLatest > 0) {
      status = "completed";
    } else if (currentInstallmentNumber >= group.installmentTotal) {
      status = "last_payment";
    } else if (remainingInstallments === 1) {
      status = "ending_soon";
    }

    plans.push({
      id: Buffer.from(group.planKey).toString("base64url"),
      merchantName: group.cleanMerchant,
      rawDescription: group.rawDescription,
      accountNumber: group.accountNumber,
      accountLabel: group.accountLabel,
      provider: group.provider,
      categoryId: group.categoryId,
      categoryName: group.categoryName,
      categoryLocalName: group.categoryLocalName,
      categoryColor: group.categoryColor,
      categoryIcon: group.categoryIcon,
      installmentTotal: group.installmentTotal,
      latestInstallmentNumber: currentInstallmentNumber,
      monthlyAmount,
      totalPlanAmount,
      paidAmount,
      remainingAmount,
      remainingInstallments,
      startDate: earliestTxn.date,
      latestDate: latestTxn.date,
      expectedEndDate,
      status,
      transactions: txns,
    });
  }

  // Sort plans: Active & Ending Soon first (by remaining installments asc), Completed last
  plans.sort((a, b) => {
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;
    if (a.remainingInstallments !== b.remainingInstallments) {
      return a.remainingInstallments - b.remainingInstallments;
    }
    return b.monthlyAmount - a.monthlyAmount;
  });

  // Calculate 12-Month Forecast
  const activePlans = plans.filter((p) => p.status !== "completed");
  const currentMonthlyBurden = activePlans.reduce((sum, p) => sum + p.monthlyAmount, 0);
  const totalRemainingBalance = activePlans.reduce((sum, p) => sum + p.remainingAmount, 0);

  const forecast: InstallmentMonthlyForecast[] = [];
  const now = new Date();

  for (let m = 0; m < 12; m++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const { monthKey, monthLabel } = getMonthInfo(targetDate);

    let committedInMonth = 0;
    let activeInMonth = 0;
    const endingInMonth: Array<{ id: string; merchantName: string; monthlyAmount: number }> = [];

    for (const plan of activePlans) {
      const latestTxnDate = new Date(plan.latestDate);
      const offsetFromLatest =
        (targetDate.getFullYear() - latestTxnDate.getFullYear()) * 12 +
        (targetDate.getMonth() - latestTxnDate.getMonth());

      // If this month corresponds to an installment number within [1, installmentTotal]
      const originalRecordedNum = plan.transactions.reduce((max, t) => {
        return Math.max(max, t.installmentNumber || 0);
      }, 0) || 1;

      const instNumInTargetMonth = originalRecordedNum + offsetFromLatest;

      if (instNumInTargetMonth <= plan.installmentTotal && instNumInTargetMonth >= 1) {
        committedInMonth += plan.monthlyAmount;
        activeInMonth++;
        if (instNumInTargetMonth === plan.installmentTotal) {
          endingInMonth.push({
            id: plan.id,
            merchantName: plan.merchantName,
            monthlyAmount: plan.monthlyAmount,
          });
        }
      }
    }

    const freedAmount = Math.max(0, Math.round((currentMonthlyBurden - committedInMonth) * 100) / 100);

    forecast.push({
      monthKey,
      monthLabel,
      committedAmount: Math.round(committedInMonth * 100) / 100,
      freedAmount,
      activePlansCount: activeInMonth,
      endingPlansCount: endingInMonth.length,
      endingPlans: endingInMonth,
    });
  }

  const freeingUpNextMonth = forecast[1] ? forecast[1].freedAmount : 0;
  const freeingUpIn3Months = forecast[3] ? forecast[3].freedAmount : 0;

  const endingSoonCount = activePlans.filter(
    (p) => p.status === "last_payment" || p.status === "ending_soon"
  ).length;

  // Find the latest expected end date among active plans
  let payoffDate: string | null = null;
  let monthsToPayoff = 0;
  if (activePlans.length > 0) {
    const sortedEndDates = activePlans
      .map((p) => p.expectedEndDate)
      .sort((a, b) => b.localeCompare(a));
    payoffDate = sortedEndDates[0] || null;
    if (payoffDate) {
      const endD = new Date(payoffDate);
      monthsToPayoff = Math.max(
        0,
        (endD.getFullYear() - now.getFullYear()) * 12 + (endD.getMonth() - now.getMonth())
      );
    }
  }

  return {
    summary: {
      monthlyBurden: Math.round(currentMonthlyBurden * 100) / 100,
      totalRemainingBalance: Math.round(totalRemainingBalance * 100) / 100,
      freeingUpNextMonth,
      freeingUpIn3Months,
      payoffDate,
      monthsToPayoff,
      activePlansCount: activePlans.length,
      endingSoonCount,
      completedPlansCount: plans.filter((p) => p.status === "completed").length,
    },
    plans,
    forecast,
  };
}
