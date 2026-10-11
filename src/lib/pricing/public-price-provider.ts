export interface PublicPricePoint {
  foodName: string;
  price: number;
  unit: string;
  marketType: "retail" | "wholesale";
  sourceName: string;
  sourceUrl: string;
  city: string;
  observedAt: string;
}

export type PublicPriceResult =
  | { status: "available"; points: PublicPricePoint[]; note: string }
  | { status: "unavailable"; points: []; note: string };

export interface PublicPriceProvider {
  query(foodName: string, city: string | null, unit: string | null): Promise<PublicPriceResult>;
}

type Fetcher = typeof fetch;

const SEARCH_URL = "https://cif.mofcom.gov.cn/cif/toSearch.fhtml";
const ARTICLE_ORIGIN = "https://cif.mofcom.gov.cn";
const FOOD_ALIASES: Record<string, string[]> = {
  "番茄": ["番茄", "西红柿"],
  "西红柿": ["西红柿", "番茄"],
  "莴笋": ["莴笋", "莴苣笋"],
  "莴苣笋": ["莴苣笋", "莴笋"],
  "圆椒": ["圆椒", "青圆椒"],
  "青圆椒": ["青圆椒", "圆椒"],
};

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&ldquo;|&rdquo;/g, "”")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function convertFromKilogram(price: number, requestedUnit: string | null) {
  if (requestedUnit === "斤" || requestedUnit === "500克") {
    return { price: price / 2, unit: "斤" };
  }
  return { price, unit: "公斤" };
}

interface ParsedReport {
  html: string;
  sourceUrl: string;
  publishedAt: string;
}

export class HangzhouMofcomPriceProvider implements PublicPriceProvider {
  private cachedReport: { expiresAt: number; value: ParsedReport | null } | null = null;

  constructor(private readonly fetcher: Fetcher = fetch) {}

  async query(foodName: string, city: string | null, unit: string | null): Promise<PublicPriceResult> {
    if (!city || !["杭州", "杭州市"].includes(city.trim())) {
      return this.unavailable(`当前只接入了杭州市级公开价格源，无法查询“${city ?? "未知城市"}”。`);
    }

    try {
      const report = await this.latestReport();
      if (!report) return this.unavailable("未能从官方站内搜索定位最新杭州菜篮子周报。");

      const paragraphs = [...report.html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)]
        .map((match) => stripHtml(match[1]))
        .filter((text) => text.startsWith("据对重点农贸市场") || text.startsWith("据对农贸市场猪肉零售价格监测统计"));
      const aliases = FOOD_ALIASES[foodName] ?? [foodName];

      for (const paragraph of paragraphs) {
        for (const alias of aliases) {
          const priceMatch = paragraph.match(
            new RegExp(`${escapeRegExp(alias)}(?:（[^）]+）)?\\s*([0-9]+(?:\\.[0-9]+)?)元/公斤`),
          );
          if (!priceMatch) continue;

          const converted = convertFromKilogram(Number(priceMatch[1]), unit);
          return {
            status: "available",
            points: [{
              foodName,
              price: Number(converted.price.toFixed(2)),
              unit: converted.unit,
              marketType: "retail",
              sourceName: "杭州市商务局菜篮子重点农贸市场监测",
              sourceUrl: report.sourceUrl,
              city: "杭州",
              observedAt: report.publishedAt,
            }],
            note: "这是杭州市级重点农贸市场零售均价，不代表某个区、具体摊位、小象超市或山姆的实时售价。",
          };
        }
      }

      return this.unavailable(`最新官方周报未公布“${foodName}”的具体零售均价。`);
    } catch {
      return this.unavailable("杭州官方价格页面暂时无法访问，本次不使用公开价格做判断。");
    }
  }

  private unavailable(note: string): PublicPriceResult {
    return { status: "unavailable", points: [], note };
  }

  private async latestReport(): Promise<ParsedReport | null> {
    const now = Date.now();
    if (this.cachedReport && this.cachedReport.expiresAt > now) return this.cachedReport.value;

    const year = new Date().getFullYear();
    const body = new URLSearchParams({ keyword: `杭州市${year}年第`, pageNo: "1", pageSize: "20" });
    const response = await this.fetcher(SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "GroceryDecisionAgent/0.1 (+personal MVP)",
      },
      body,
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) throw new Error(`Official price source returned ${response.status}`);
    const html = await response.text();
    const blocks = [...html.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map((match) => match[1]);
    const block = blocks.find((item) => {
      const title = stripHtml(item.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? "");
      return title.includes(`浙江省杭州市${year}年第`) && title.includes("生活必需品市场运行情况");
    });

    let value: ParsedReport | null = null;
    if (block) {
      const href = block.match(/href=["']([^"']+market_scanner[^"']+)["']/i)?.[1];
      const publishedAt = stripHtml(block.match(/<span[^>]*class=["']u-time["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "");
      if (href && /^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) {
        value = {
          html: block,
          sourceUrl: new URL(href.replace("/html//", "/html/"), ARTICLE_ORIGIN).toString(),
          publishedAt: new Date(`${publishedAt}T00:00:00+08:00`).toISOString(),
        };
      }
    }

    this.cachedReport = { expiresAt: now + 30 * 60 * 1_000, value };
    return value;
  }
}

export const publicPriceProvider: PublicPriceProvider = new HangzhouMofcomPriceProvider();
