import { NextResponse } from "next/server";
import {
  savePushSubscription,
  deletePushSubscription,
} from "@/server/db/queries/push-subscriptions";

export async function POST(req: Request) {
  try {
    const subscription = await req.json();
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Invalid subscription object" },
        { status: 400 }
      );
    }
    savePushSubscription(subscription);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving subscription:", error);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const endpoint = body.endpoint;
    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint is required" },
        { status: 400 }
      );
    }
    deletePushSubscription(endpoint);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 }
    );
  }
}
