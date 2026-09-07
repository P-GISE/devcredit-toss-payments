import type { NextRequest } from "next/server"
import { handleMeteredDemoRequest } from "@/lib/demo-api"

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text") ?? ""
  return handleMeteredDemoRequest({
    request,
    endpoint: "/api/demo/sentiment",
    cost: 5,
    createPayload: ({ requestId, remainingCredits }) => ({
      sentiment: text.toLowerCase().includes("bad") ? "negative" : "positive",
      confidence: 0.92,
      cost: 5,
      remainingCredits,
      requestId
    })
  })
}
