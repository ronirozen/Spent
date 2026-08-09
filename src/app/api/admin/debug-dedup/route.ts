import { NextResponse } from "next/server";
import { getDb } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT id, date, description, original_amount, original_currency, charged_amount, status, identifier, dedup_hash, dedup_sequence 
      FROM transactions 
      WHERE date LIKE '2026-08-04%'
    `).all();
    return NextResponse.json({ success: true, rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
