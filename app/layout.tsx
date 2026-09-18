import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vitto | MSME Loan Repayment Service",
  description:
    "Enterprise loan repayment schedule generation, payment allocation engine, and real-time position reporting for MSME lending institutions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-zinc-100 antialiased selection:bg-zinc-800 selection:text-white">
        {children}
      </body>
    </html>
  );
}
