import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { backfillDedupHashes } from "@/server/lib/fixup-dedup-hashes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const processedCount = backfillDedupHashes(db);
    return NextResponse.json({
      success: true,
      message: `Successfully recalculated deduplication hashes for ${processedCount} transactions. Duplicate pending transactions have been cleaned up.`,
      processedCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
