import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "React Email Editor Playground",
  description:
    "React Email Editor Playground — build responsive emails visually with drag-and-drop blocks, style controls, merge tags, and HTML export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
