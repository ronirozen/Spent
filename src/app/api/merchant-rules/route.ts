import { NextResponse } from "next/server";
import {
  listMerchantRules,
  addMerchantRule,
} from "@/server/db/queries/merchant-rules";
import { getWorkspaceIdFromRequest } from "@/server/lib/workspace-context";

export async function GET(request: Request) {
  const workspaceId = getWorkspaceIdFromRequest(request);
  return NextResponse.json({ rules: listMerchantRules(workspaceId) });
}

export async function POST(request: Request) {
  const workspaceId = getWorkspaceIdFromRequest(request);
  const body = await request.json();
  const { provider, merchantKey, matchType, action, normalizedName } = body;

  if (!merchantKey || !matchType || !action) {
    return NextResponse.json(
      { error: "merchantKey, matchType, and action are required" },
      { status: 400 }
    );
  }

  addMerchantRule(
    workspaceId,
    provider || null,
    merchantKey,
    matchType,
    action,
    normalizedName || null
  );

  return NextResponse.json({ success: true });
}
