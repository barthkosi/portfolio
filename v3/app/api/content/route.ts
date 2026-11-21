import { type NextRequest, NextResponse } from "next/server";
import { getContentIndex } from "@/lib/content-store";
import { isContentCategory } from "@/lib/content-types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  const index = await getContentIndex();

  if (category) {
    if (!isContentCategory(category)) {
      return NextResponse.json(
        { error: "Invalid category parameter", items: [] },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { category, items: index[category], updatedAt: index.updatedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(index, {
    headers: { "Cache-Control": "no-store" },
  });
}
