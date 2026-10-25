"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/learn", label: "学习", icon: "▤" },
  { href: "/", label: "对话", icon: "◎" },
  { href: "/profile", label: "画像", icon: "○" },
  { href: "/settings", label: "设置", icon: "⚙" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <header className="app-header">
      <Link className="app-brand" href="/" aria-label="菜菜参谋首页">
        <span>菜</span>
        <strong>菜菜参谋</strong>
      </Link>
      <nav aria-label="主导航">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? "active" : undefined}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
