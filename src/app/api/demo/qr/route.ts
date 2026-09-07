import type { NextRequest } from "next/server"
import { handleMeteredDemoRequest } from "@/lib/demo-api"

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text") ?? ""
  return handleMeteredDemoRequest({
    request,
    endpoint: "/api/demo/qr",
    cost: 10,
    createPayload: ({ requestId, remainingCredits }) => ({
      qr: {
        format: "mock",
        payload: `DEV-CREDIT-QR:${Buffer.from(text, "utf8").toString("base64url")}`
      },
      cost: 10,
      remainingCredits,
      requestId
    })
  })
}
