import {
  foodQuerySchema,
  publicPriceQuerySchema,
  saveObservationSchema,
} from "@/lib/domain/schemas";
import { publicPriceProvider } from "@/lib/pricing/public-price-provider";
import { groceryRepository } from "@/lib/storage/json-repository";

export async function executeGroceryTool(name: string, rawArguments: string): Promise<unknown> {
  const input: unknown = JSON.parse(rawArguments || "{}");

  switch (name) {
    case "get_user_profile":
      return groceryRepository.getProfile();
    case "query_price_history": {
      const args = foodQuerySchema.parse(input);
      const observations = await groceryRepository.queryPriceHistory(args.food_name, args.limit);
      return { count: observations.length, observations };
    }
    case "query_inventory": {
      const args = foodQuerySchema.pick({ food_name: true }).parse(input);
      const items = await groceryRepository.queryInventory(args.food_name);
      return { count: items.length, items };
    }
    case "query_public_reference_prices": {
      const args = publicPriceQuerySchema.parse(input);
      return publicPriceProvider.query(args.food_name, args.city, args.unit);
    }
    case "save_price_observation": {
      const args = saveObservationSchema.parse(input);
      const observation = await groceryRepository.savePriceObservation({
        foodName: args.food_name,
        price: args.price,
        unit: args.unit,
        store: args.store,
        city: args.city,
        observedAt: args.observed_at ?? new Date().toISOString(),
      });
      return { saved: true, observation };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export function safeToolError(name: string, error: unknown): { status: "error"; error: string; hint: string } {
  const errorType = error instanceof Error ? error.constructor.name : "UnknownError";
  console.warn(`[grocery-tool] ${name} failed: ${errorType}`);
  return {
    status: "error",
    error: `工具 ${name} 执行失败：${errorType}`,
    hint: "请检查参数后最多重试一次；仍失败则如实说明该项证据不可用。",
  };
}
