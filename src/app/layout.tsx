import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Analytics AI Platform",
  description: "Private AI analytics workspaces for business files and datasets."
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
