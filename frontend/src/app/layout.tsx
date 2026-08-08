import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BiB Monitor | Operations Overview",
  description:
    "Bag-in-Box beverage inventory monitoring and operational readiness.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
