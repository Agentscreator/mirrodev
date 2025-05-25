// app/layout.tsx
import type { Metadata } from "next"
import { Providers } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "Mirro",
  description: "Connect with others who share your interests",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/stream-chat.css" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}