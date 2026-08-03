import { NextResponse } from "next/server";
import { getWorkspaceIdFromRequest } from "@/server/lib/workspace-context";
import { getSubscriptionAlerts } from "@/server/db/queries/subscriptions";
import { getInstallmentAlerts } from "@/server/lib/installments-alerts";
import type { AppAlert } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);
    
    const subAlerts = getSubscriptionAlerts(workspaceId, false).map((a): AppAlert => ({
      id: a.id,
      type: "price_hike",
      workspaceId: a.workspaceId,
      subscriptionId: a.subscriptionId,
      transactionId: a.transactionId,
      subscriptionName: a.subscriptionName || "Subscription",
      previousAmount: a.previousAmount,
      newAmount: a.newAmount,
      isDismissed: a.isDismissed,
      createdAt: a.createdAt,
    }));

    const instAlerts = getInstallmentAlerts(workspaceId, false).map((a): AppAlert => ({
      id: a.id,
      type: "last_payment",
      workspaceId: a.workspaceId,
      transactionId: a.transactionId,
      merchantName: a.merchantName,
      installmentNumber: a.installmentNumber,
      installmentTotal: a.installmentTotal,
      freedAmount: a.freedAmount,
      isDismissed: a.isDismissed,
      createdAt: a.createdAt,
    }));

    const alerts: AppAlert[] = [...subAlerts, ...instAlerts].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );

    return NextResponse.json({ alerts });
  } catch (err) {
    console.error("Failed to fetch alerts:", err);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}
