import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  GroceryState,
  InventoryItem,
  PriceObservation,
  UserProfile,
} from "@/lib/domain/types";
import type { GroceryRepository, SaveObservationInput } from "./repository";

const statePath = path.join(process.cwd(), "data", "grocery-state.json");
const exampleStatePath = path.join(process.cwd(), "data", "grocery-state.example.json");

export function normalizeFoodName(value: string): string {
  return value.trim().toLocaleLowerCase("zh-CN").replace(/\s+/g, "");
}

async function loadState(): Promise<GroceryState> {
  let raw: string;
  try {
    raw = await fs.readFile(statePath, "utf8");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      throw error;
    }

    const initialState = await fs.readFile(exampleStatePath, "utf8");
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    try {
      await fs.writeFile(statePath, initialState, { encoding: "utf8", flag: "wx" });
      raw = initialState;
    } catch (writeError) {
      if (!(writeError instanceof Error && "code" in writeError && writeError.code === "EEXIST")) {
        throw writeError;
      }
      raw = await fs.readFile(statePath, "utf8");
    }
  }
  return JSON.parse(raw) as GroceryState;
}

async function saveState(state: GroceryState): Promise<void> {
  const temporaryPath = `${statePath}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await fs.rename(temporaryPath, statePath);
}

class JsonGroceryRepository implements GroceryRepository {
  async getProfile(): Promise<UserProfile> {
    return (await loadState()).profile;
  }

  async updateProfile(update: Partial<UserProfile>): Promise<UserProfile> {
    const state = await loadState();
    state.profile = { ...state.profile, ...update, id: state.profile.id };
    await saveState(state);
    return state.profile;
  }

  async queryPriceHistory(foodName: string, limit = 20): Promise<PriceObservation[]> {
    const normalized = normalizeFoodName(foodName);
    return (await loadState()).priceObservations
      .filter((item) => item.normalizedFoodName === normalized)
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
      .slice(0, limit);
  }

  async savePriceObservation(input: SaveObservationInput): Promise<PriceObservation> {
    const state = await loadState();
    const observation: PriceObservation = {
      id: crypto.randomUUID(),
      foodName: input.foodName,
      normalizedFoodName: normalizeFoodName(input.foodName),
      price: input.price,
      unit: input.unit,
      store: input.store,
      city: input.city,
      observedAt: input.observedAt,
      source: "personal_observation",
    };
    state.priceObservations.push(observation);
    await saveState(state);
    return observation;
  }

  async queryInventory(foodName: string): Promise<InventoryItem[]> {
    const normalized = normalizeFoodName(foodName);
    return (await loadState()).inventory.filter(
      (item) => item.normalizedFoodName === normalized && item.status === "available",
    );
  }

  readState(): Promise<GroceryState> {
    return loadState();
  }
}

export const groceryRepository: GroceryRepository = new JsonGroceryRepository();
