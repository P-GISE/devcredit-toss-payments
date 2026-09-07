import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "DevCredit",
  description: "Developer API credit charging SaaS demo"
}

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
