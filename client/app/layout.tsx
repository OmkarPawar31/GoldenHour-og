import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Golden Hour",
  description: "Emergency response and ambulance tracking system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
