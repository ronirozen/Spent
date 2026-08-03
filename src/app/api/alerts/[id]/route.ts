import { NextResponse } from "next/server";
import { getWorkspaceIdFromRequest } from "@/server/lib/workspace-context";
import { dismissAlert } from "@/server/db/queries/subscriptions";
import { dismissInstallmentAlert } from "@/server/lib/installments-alerts";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);
    const resolvedParams = await params;
    const alertId = parseInt(resolvedParams.id, 10);
    
    if (isNaN(alertId)) {
      return NextResponse.json({ error: "Invalid alert ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "last_payment") {
      dismissInstallmentAlert(workspaceId, alertId);
    } else if (type === "price_hike") {
      dismissAlert(workspaceId, alertId);
    } else {
      // Dismiss from both to be safe
      dismissAlert(workspaceId, alertId);
      dismissInstallmentAlert(workspaceId, alertId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to dismiss alert:", err);
    return NextResponse.json({ error: "Failed to dismiss alert" }, { status: 500 });
  }
}
