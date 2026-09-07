import { PaymentConfirmer } from "@/components/payment-confirmer"

type BillingSuccessPageProps = {
  readonly searchParams: Promise<{
    readonly paymentKey?: string
    readonly orderId?: string
    readonly amount?: string
  }>
}

export default async function BillingSuccessPage({ searchParams }: BillingSuccessPageProps) {
  const params = await searchParams
  return <PaymentConfirmer amount={params.amount} orderId={params.orderId} paymentKey={params.paymentKey} />
}
