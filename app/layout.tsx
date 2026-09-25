import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeachLog - IIHM Teaching Log & Summary System",
  description: "IIHM Hyderabad Teaching Log Sheet and Weekly Summary management application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
