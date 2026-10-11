import type { Metadata } from "next";
import { AppNav } from "./components/app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "菜菜参谋",
  description: "给做饭小白的个人买菜决策 Agent",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
