import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "城市设计传导实验台",
  description: "片区、单元与地块城市设计要素传导可视化 MVP。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
