import { NextResponse } from "next/server";
import { getWorkspaceIdFromRequest } from "@/server/lib/workspace-context";
import { dismissAlert } from "@/server/db/queries/subscriptions";

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

    dismissAlert(workspaceId, alertId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to dismiss alert:", err);
    return NextResponse.json({ error: "Failed to dismiss alert" }, { status: 500 });
  }
}
