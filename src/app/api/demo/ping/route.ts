import type { NextRequest } from "next/server"
import { handleMeteredDemoRequest } from "@/lib/demo-api"

export async function GET(request: NextRequest) {
  return handleMeteredDemoRequest({
    request,
    endpoint: "/api/demo/ping",
    cost: 1,
    createPayload: ({ requestId, remainingCredits }) => ({
      message: "pong",
      cost: 1,
      remainingCredits,
      requestId
    })
  })
}
