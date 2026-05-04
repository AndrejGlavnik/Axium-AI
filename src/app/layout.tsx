import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Axium AI Analytics Platform",
  description: "Private AI analytics workspaces with Axium Knowledge."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
