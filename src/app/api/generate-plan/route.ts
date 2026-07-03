import { NextRequest, NextResponse } from "next/server";
import { GeneratePlanRequestSchema } from "@/lib/schemas";
import { structureWithFallback } from "@/lib/services/llm-service";
import { enrichPlanWithSerper } from "@/lib/services/search-service";
import { dedupeResourceUrls, toHobbyPlan } from "@/lib/services/transformer";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsedRequest = GeneratePlanRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsedRequest.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsedRequest.data;

  try {
    const rawSkeleton = await structureWithFallback(input);
    const enrichedPlan = await enrichPlanWithSerper(rawSkeleton, input.hobbyName);
    const dedupedPlan = dedupeResourceUrls(enrichedPlan, input.hobbyName);
    return NextResponse.json(toHobbyPlan(input, dedupedPlan), { status: 200 });
  } catch (err) {
    console.error("[generate-plan] failed after all fallbacks", err);
    return NextResponse.json(
      { error: "We couldn't generate your plan right now. Please try again in a moment." },
      { status: 502 }
    );
  }
}
