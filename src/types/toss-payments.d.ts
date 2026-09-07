export {}

type TossPaymentRequest = {
  readonly method: "CARD"
  readonly amount: {
    readonly currency: "KRW"
    readonly value: number
  }
  readonly orderId: string
  readonly orderName: string
  readonly successUrl: string
  readonly failUrl: string
  readonly customerEmail?: string
  readonly customerName?: string
  readonly windowTarget?: "self" | "iframe"
  readonly metadata?: Readonly<Record<string, string>>
}

type TossPayment = {
  readonly requestPayment: (request: TossPaymentRequest) => Promise<void>
}

type TossPaymentsSdk = {
  readonly payment: (params: { readonly customerKey: string }) => TossPayment
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsSdk
  }
}
