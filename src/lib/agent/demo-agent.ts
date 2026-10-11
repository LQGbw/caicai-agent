import type { AgentDecision, AgentRunInput } from "@/lib/domain/types";
import { publicPriceProvider } from "@/lib/pricing/public-price-provider";
import { groceryRepository } from "@/lib/storage/json-repository";

const knownFoods = [
  "鸡腿",
  "鸡胸",
  "鸡蛋",
  "番茄",
  "西红柿",
  "土豆",
  "菠菜",
  "青菜",
  "生菜",
  "西兰花",
  "猪肉",
  "牛肉",
  "豆腐",
  "蘑菇",
  "香菇",
];

const advice: Record<string, { storage: string; cooking: string }> = {
  鸡腿: { storage: "冷藏建议 1～2 天内吃；吃不完立即分装冷冻。", cooking: "加生抽和盐腌 10 分钟，空气炸锅或平底锅煎熟。" },
  鸡蛋: { storage: "原盒冷藏，避免反复温度变化。", cooking: "水煮蛋、番茄炒蛋都是低失败率做法。" },
  菠菜: { storage: "不要提前清洗，用厨房纸包裹后冷藏，优先在 2～3 天内吃。", cooking: "焯水后加蒜末和生抽，约 8 分钟。" },
  土豆: { storage: "阴凉、避光、通风保存，不要和洋葱堆在一起。", cooking: "切小块后焖煮，或切丝快炒。发绿、明显发芽时不要吃。" },
  豆腐: { storage: "冷藏并尽快食用，开封后通常不适合久放。", cooking: "切块后加酱油和少量水焖 10 分钟。" },
};

function extractFood(message: string): string {
  return knownFoods.find((food) => message.includes(food)) ?? "未识别食材";
}

function extractPrice(message: string): { price: number | null; unit: string | null } {
  const match = message.match(/(\d+(?:\.\d+)?)\s*元?\s*(?:[/每]\s*|一)?(斤|公斤|千克|500克|克|个|盒|袋)/);
  if (!match) return { price: null, unit: null };
  return { price: Number(match[1]), unit: match[2] === "500克" ? "斤" : match[2] };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export async function runDemoAgent(input: AgentRunInput): Promise<AgentDecision> {
  const foodName = extractFood(input.message);
  const { price, unit } = extractPrice(input.message);
  const profile = await groceryRepository.getProfile();
  const history = foodName === "未识别食材" ? [] : await groceryRepository.queryPriceHistory(foodName);
  const comparable = history.filter((item) => item.unit === unit);
  const inventory = foodName === "未识别食材" ? [] : await groceryRepository.queryInventory(foodName);
  const publicPrices = foodName === "未识别食材"
    ? { status: "unavailable" as const, points: [] as const, note: "未识别食材，未查询公开价格。" }
    : await publicPriceProvider.query(foodName, profile.city, unit);
  const usableAdvice = advice[foodName] ?? {
    storage: "请先确认具体食材和包装状态，再决定冷藏、冷冻或常温保存。",
    cooking: "优先选择少切配、单锅完成的做法。",
  };

  let priceVerdict: AgentDecision["priceVerdict"] = "insufficient_data";
  let recommendation: AgentDecision["recommendation"] = "uncertain";
  let confidence: AgentDecision["confidence"] = "low";
  const evidence: string[] = [];
  const reasons: string[] = [];

  if (foodName === "未识别食材") {
    reasons.push(input.imageDataUrl ? "演示模式不能识别图片，请配置模型密钥后再试。" : "请补充食材名称。" );
  } else if (price === null || unit === null) {
    reasons.push("已识别食材，但还缺少价格或单位。比如可以说“鸡腿 9.9 元一斤”。");
  } else if (comparable.length < 2 && publicPrices.status === "available") {
    const reference = publicPrices.points[0];
    const ratio = price / reference.price;
    priceVerdict = ratio < 0.85 ? "low" : ratio > 1.15 ? "high" : "normal";
    confidence = "medium";
    recommendation = priceVerdict === "high" ? "skip" : "buy";
    reasons.push(`当前价格相对杭州重点农贸市场公开均价${priceVerdict === "low" ? "更低" : priceVerdict === "high" ? "更高" : "接近"}。`);
    evidence.push(`官方市级零售参考价为 ${reference.price.toFixed(2)} 元/${reference.unit}；${publicPrices.note}`);
  } else if (comparable.length < 2) {
    reasons.push("个人历史样本不足，公开源也没有可比价格，暂时不能可靠判断。");
    evidence.push(`同单位个人历史 ${comparable.length} 条。${publicPrices.note}`);
  } else {
    const typical = median(comparable.map((item) => item.price));
    const ratio = price / typical;
    priceVerdict = ratio < 0.85 ? "low" : ratio > 1.15 ? "high" : "normal";
    confidence = comparable.length >= 5 ? "high" : "medium";
    recommendation = priceVerdict === "high" ? "skip" : "buy";
    reasons.push(`当前价格相对你的历史中位价${priceVerdict === "low" ? "更低" : priceVerdict === "high" ? "更高" : "接近"}。`);
    evidence.push(`你的 ${comparable.length} 条同单位记录中位价为 ${typical.toFixed(2)} 元/${unit}。`);
  }

  if (inventory.length > 0) {
    recommendation = "skip";
    reasons.push(`库存中已有 ${inventory.length} 份同类食材，重复购买会增加浪费风险。`);
    evidence.push("库存记录优先于低价信号。");
  } else if (foodName !== "未识别食材") {
    evidence.push("当前没有记录到同类库存。请注意：未记录不等于实际没有。" );
  }

  let observationSaved = false;
  if (foodName !== "未识别食材" && price !== null && unit !== null) {
    await groceryRepository.savePriceObservation({
      foodName,
      price,
      unit,
      store: null,
      city: profile.city,
      observedAt: new Date().toISOString(),
    });
    observationSaved = true;
  }

  const headline = recommendation === "buy"
    ? "可以买，但按实际会吃的量买"
    : recommendation === "skip"
      ? "这次更建议先不买"
      : "信息还不够，先记录再判断";

  return {
    foodName,
    observedPrice: price,
    observedUnit: unit,
    recommendation,
    headline,
    priceVerdict,
    confidence,
    reasons,
    evidence,
    storageAdvice: usableAdvice.storage,
    easyCookingAdvice: usableAdvice.cooking,
    observationSaved,
    mode: "demo",
    toolTrace: [
      { tool: "get_user_profile", status: "success", summary: "已读取个人画像" },
      { tool: "query_price_history", status: "success", summary: `返回 ${history.length} 条记录` },
      { tool: "query_inventory", status: "success", summary: `返回 ${inventory.length} 条记录` },
      { tool: "query_public_reference_prices", status: "success", summary: `状态：${publicPrices.status}` },
      ...(observationSaved
        ? [{ tool: "save_price_observation", status: "success" as const, summary: "已保存价格观察" }]
        : []),
    ],
  };
}
