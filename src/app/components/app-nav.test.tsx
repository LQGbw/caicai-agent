import { renderToStaticMarkup } from "react-dom/server";
import type { AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppNav } from "./app-nav";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/link", () => ({ default: ({ prefetch, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => (
  <a {...props} data-client-link="true" data-prefetch={String(prefetch)} />
) }));

describe("navigation across proxy authentication", () => {
  it("uses document links for private pages and never prefetches public links", () => {
    const html = renderToStaticMarkup(<AppNav />);
    const anchors = html.match(/<a\b[^>]*>/g) ?? [];
    for (const href of ["/settings", "/profile"]) {
      const link = anchors.find((tag) => tag.includes(`href="${href}"`));
      expect(link).toBeDefined();
      expect(link).not.toContain("data-client-link");
    }
    for (const link of anchors.filter((tag) => tag.includes("data-client-link"))) {
      expect(link).toContain('data-prefetch="false"');
    }
  });
});
