import { NextResponse } from "next/server";

// Switch to standard serverless runtime
export const runtime = 'nodejs';
export const dynamic = "force-dynamic";

export async function GET() {
    return NextResponse.json({
      key: process.env.DEEPGRAM_API_KEY ?? "",
    });
}
