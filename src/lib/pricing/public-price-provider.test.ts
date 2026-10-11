import { describe, expect, it, vi } from "vitest";
import { HangzhouMofcomPriceProvider } from "./public-price-provider";

const currentYear = new Date().getFullYear();
const officialSearchHtml = `
<ul class="u-result-list">
  <li>
    <h3 class="u-tt"><a href="/cif/html//market_scanner/2026/8/example.html">
      浙江省杭州市${currentYear}年第31周生活必需品市场运行情况
    </a></h3>
    <p>据对主要蔬菜批发交易市场监测统计：青菜2.99元/公斤。</p>
    <p>据对重点农贸市场监测统计，青菜5.20元/公斤；西红柿8.40元/公斤。</p>
    <span class="u-time">2026-08-17</span>
  </li>
</ul>`;

describe("HangzhouMofcomPriceProvider", () => {
  it("读取农贸市场零售价而不是批发价，并转换为元/斤", async () => {
    const fetcher = vi.fn(async () => new Response(officialSearchHtml, { status: 200 }));
    const provider = new HangzhouMofcomPriceProvider(fetcher as typeof fetch);
    const result = await provider.query("青菜", "杭州", "斤");

    expect(result.status).toBe("available");
    if (result.status === "available") {
      expect(result.points[0]).toMatchObject({ price: 2.6, unit: "斤", marketType: "retail" });
    }
  });

  it("支持番茄与西红柿别名", async () => {
    const fetcher = vi.fn(async () => new Response(officialSearchHtml, { status: 200 }));
    const provider = new HangzhouMofcomPriceProvider(fetcher as typeof fetch);
    const result = await provider.query("番茄", "杭州市", "公斤");

    expect(result.status).toBe("available");
    if (result.status === "available") expect(result.points[0].price).toBe(8.4);
  });

  it("不把杭州数据用到其他城市", async () => {
    const fetcher = vi.fn();
    const provider = new HangzhouMofcomPriceProvider(fetcher as typeof fetch);
    const result = await provider.query("青菜", "宁波", "斤");

    expect(result.status).toBe("unavailable");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
