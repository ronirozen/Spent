import { NextResponse } from "next/server";
import { getVapidKeys } from "@/server/db/queries/push-subscriptions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { publicKey } = getVapidKeys();
    return NextResponse.json({ publicKey });
  } catch (error) {
    console.error("Error getting VAPID public key:", error);
    return NextResponse.json(
      { error: "Failed to get VAPID public key" },
      { status: 500 }
    );
  }
}
