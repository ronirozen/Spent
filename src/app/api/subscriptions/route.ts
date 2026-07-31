import { NextResponse } from "next/server";
import { getWorkspaceIdFromRequest } from "@/server/lib/workspace-context";
import { getDb } from "@/server/db/index";
import { createSubscription, linkTransactionToSubscription, getSubscriptions } from "@/server/db/queries/subscriptions";

export async function POST(request: Request) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);
    
    const body = await request.json();
    const { transactionId } = body;
    
    if (!transactionId) {
      return NextResponse.json({ error: "Missing transactionId" }, { status: 400 });
    }

    const db = getDb();
    const txn = db.prepare(`
      SELECT description, charged_amount as amount, original_currency as currency
      FROM transactions
      WHERE id = ? AND workspace_id = ?
    `).get(transactionId, workspaceId) as { description: string, amount: number, currency: string } | undefined;

    if (!txn) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const isExpense = txn.amount < 0;
    
    const existingSubs = getSubscriptions(workspaceId);
    const existing = existingSubs.find(s => s.name.toLowerCase() === txn.description.toLowerCase());

    let subId: number;
    if (existing) {
      subId = existing.id;
    } else {
      const normalizedCurrency = txn.currency === "₪" ? "ILS" : (txn.currency || "ILS");
      subId = createSubscription(workspaceId, {
        name: txn.description,
        amount: Math.abs(txn.amount),
        currency: normalizedCurrency,
        frequency: "monthly",
        type: isExpense ? "expense" : "income",
        status: "active"
      });
    }

    linkTransactionToSubscription(workspaceId, transactionId, subId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to create subscription:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
