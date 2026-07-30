import { NextResponse } from "next/server";
import { getWorkspaceIdFromRequest } from "@/server/lib/workspace-context";
import { getSubscriptionAlerts } from "@/server/db/queries/subscriptions";

export async function GET(request: Request) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);
    const alerts = getSubscriptionAlerts(workspaceId, false);
    return NextResponse.json({ alerts });
  } catch (err) {
    console.error("Failed to fetch alerts:", err);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}
