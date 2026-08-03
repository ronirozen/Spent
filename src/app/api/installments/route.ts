import { NextResponse } from "next/server";
import { getWorkspaceIdFromRequest } from "@/server/lib/workspace-context";
import { getInstallmentsOverview } from "@/server/db/queries/installments";

export async function GET(request: Request) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);
    const overview = getInstallmentsOverview(workspaceId);
    return NextResponse.json(overview);
  } catch (err) {
    console.error("Failed to fetch installments overview:", err);
    return NextResponse.json(
      { error: "Failed to fetch installments overview" },
      { status: 500 }
    );
  }
}
