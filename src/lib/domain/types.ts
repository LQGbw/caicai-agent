export type CookingLevel = "beginner" | "intermediate" | "advanced";
export type PriceSensitivity = "low" | "medium" | "high";

export interface ActivityArea {
  label: string;
  district: string | null;
}

export interface UserProfile {
  id: string;
  city: string | null;
  shoppingChannels: string[];
  activityAreas: ActivityArea[];
  householdSize: number;
  mealsPerWeek: number;
  budgetPerMeal: number | null;
  maxCookingMinutes: number | null;
  cookingLevel: CookingLevel;
  dislikesComplexPrep: boolean;
  willingToStock: boolean;
  priceSensitivity: PriceSensitivity;
}

export interface PriceObservation {
  id: string;
  foodName: string;
  normalizedFoodName: string;
  price: number;
  unit: string;
  store: string | null;
  city: string | null;
  observedAt: string;
  source: "personal_observation" | "public_retail" | "public_wholesale";
}

export interface InventoryItem {
  id: string;
  foodName: string;
  normalizedFoodName: string;
  quantity: number | null;
  unit: string | null;
  storageMethod: string | null;
  purchasedAt: string;
  expiresAt: string | null;
  status: "available" | "used" | "wasted";
}

export interface PurchaseRecord {
  id: string;
  observationId: string | null;
  foodName: string;
  quantity: number | null;
  unit: string | null;
  purchasedAt: string;
}

export interface UsageFeedback {
  id: string;
  foodName: string;
  outcome: "used" | "wasted" | "too_hard" | "liked" | "disliked";
  note: string | null;
  createdAt: string;
}

export interface GroceryState {
  profile: UserProfile;
  priceObservations: PriceObservation[];
  inventory: InventoryItem[];
  purchaseRecords: PurchaseRecord[];
  feedback: UsageFeedback[];
}

export interface AgentDecision {
  foodName: string;
  observedPrice: number | null;
  observedUnit: string | null;
  recommendation: "buy" | "skip" | "uncertain";
  headline: string;
  priceVerdict: "low" | "normal" | "high" | "insufficient_data";
  confidence: "low" | "medium" | "high";
  reasons: string[];
  evidence: string[];
  storageAdvice: string;
  easyCookingAdvice: string;
  observationSaved: boolean;
  mode: "live" | "demo";
  toolTrace?: ToolTraceItem[];
}

export interface ToolTraceItem {
  tool: string;
  status: "success" | "error";
  summary: string;
}

export interface AgentRunInput {
  message: string;
  imageDataUrl?: string;
}
