import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Payments Tracker",
  description: "Invoice and payment tracking dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
