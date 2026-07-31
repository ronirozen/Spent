import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { updateSubscription } from "@/server/db/queries/subscriptions";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const headersList = await headers();
    const workspaceId = Number(headersList.get("x-workspace-id"));
    
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace ID" }, { status: 400 });
    }

    const { id } = await params;
    const subscriptionId = Number(id);

    if (isNaN(subscriptionId)) {
      return NextResponse.json({ error: "Invalid subscription ID" }, { status: 400 });
    }

    // Cancel the subscription instead of hard-deleting it, so the backend doesn't re-create it next sync
    updateSubscription(workspaceId, subscriptionId, { status: "cancelled" });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove subscription:", error);
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 }
    );
  }
}
