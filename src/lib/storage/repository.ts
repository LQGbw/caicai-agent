import type {
  GroceryState,
  InventoryItem,
  PriceObservation,
  UserProfile,
} from "@/lib/domain/types";

export interface SaveObservationInput {
  foodName: string;
  price: number;
  unit: string;
  store: string | null;
  city: string | null;
  observedAt: string;
}

export interface GroceryRepository {
  getProfile(): Promise<UserProfile>;
  updateProfile(update: Partial<UserProfile>): Promise<UserProfile>;
  queryPriceHistory(foodName: string, limit?: number): Promise<PriceObservation[]>;
  savePriceObservation(input: SaveObservationInput): Promise<PriceObservation>;
  queryInventory(foodName: string): Promise<InventoryItem[]>;
  readState(): Promise<GroceryState>;
}
