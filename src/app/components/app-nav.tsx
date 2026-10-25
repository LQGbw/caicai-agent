"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/learn", label: "学习", icon: "▤", protected: false },
  { href: "/", label: "对话", icon: "◎", protected: false },
  { href: "/profile", label: "画像", icon: "○", protected: true },
  { href: "/settings", label: "设置", icon: "⚙", protected: true },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <header className="app-header">
      <Link className="app-brand" href="/" prefetch={false} aria-label="菜菜参谋首页">
        <span>菜</span>
        <strong>菜菜参谋</strong>
      </Link>
      <nav aria-label="主导航">
        {items.map((item) => {
          const content = <><span aria-hidden>{item.icon}</span>{item.label}</>;
          const className = pathname === item.href ? "active" : undefined;
          // Basic Auth must be a deliberate document navigation, never a background RSC fetch.
          // A plain anchor also prevents failed prefetches from being retried on hover.
          return item.protected
            ? <a key={item.href} href={item.href} className={className}>{content}</a>
            : <Link key={item.href} href={item.href} prefetch={false} className={className}>{content}</Link>;
        })}
      </nav>
    </header>
  );
}
