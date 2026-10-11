import { z } from "zod";

const activityAreaSchema = z.object({
  label: z.string().trim().min(1).max(80),
  district: z.string().trim().min(1).max(80).nullable(),
});

export const profileUpdateSchema = z.object({
  city: z.string().trim().max(80).nullable().optional(),
  shoppingChannels: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
  activityAreas: z.array(activityAreaSchema).max(20).optional(),
  householdSize: z.number().int().min(1).max(20).optional(),
  mealsPerWeek: z.number().int().min(0).max(21).optional(),
  budgetPerMeal: z.number().min(0).max(10000).nullable().optional(),
  maxCookingMinutes: z.number().int().min(0).max(600).nullable().optional(),
  cookingLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  dislikesComplexPrep: z.boolean().optional(),
  willingToStock: z.boolean().optional(),
  priceSensitivity: z.enum(["low", "medium", "high"]).optional(),
});

export const saveObservationSchema = z.object({
  food_name: z.string().trim().min(1).max(80),
  price: z.number().finite().min(0).max(100000),
  unit: z.string().trim().min(1).max(30),
  store: z.string().trim().max(120).nullable(),
  city: z.string().trim().max(80).nullable(),
  observed_at: z.string().datetime().nullable(),
});

export const foodQuerySchema = z.object({
  food_name: z.string().trim().min(1).max(80),
  limit: z.number().int().min(1).max(50).optional(),
});

export const publicPriceQuerySchema = z.object({
  food_name: z.string().trim().min(1).max(80),
  city: z.string().trim().max(80).nullable(),
  unit: z.string().trim().max(30).nullable(),
});

export const agentDecisionJsonSchema = {
  type: "object",
  properties: {
    foodName: { type: "string" },
    observedPrice: { type: ["number", "null"] },
    observedUnit: { type: ["string", "null"] },
    recommendation: { type: "string", enum: ["buy", "skip", "uncertain"] },
    headline: { type: "string" },
    priceVerdict: {
      type: "string",
      enum: ["low", "normal", "high", "insufficient_data"],
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    reasons: { type: "array", items: { type: "string" } },
    evidence: { type: "array", items: { type: "string" } },
    storageAdvice: { type: "string" },
    easyCookingAdvice: { type: "string" },
    observationSaved: { type: "boolean" },
    mode: { type: "string", enum: ["live", "demo"] },
  },
  required: [
    "foodName",
    "observedPrice",
    "observedUnit",
    "recommendation",
    "headline",
    "priceVerdict",
    "confidence",
    "reasons",
    "evidence",
    "storageAdvice",
    "easyCookingAdvice",
    "observationSaved",
    "mode"
  ],
  additionalProperties: false,
} as const;

export const agentDecisionSchema = z.object({
  foodName: z.string(),
  observedPrice: z.number().nullable(),
  observedUnit: z.string().nullable(),
  recommendation: z.enum(["buy", "skip", "uncertain"]),
  headline: z.string(),
  priceVerdict: z.enum(["low", "normal", "high", "insufficient_data"]),
  confidence: z.enum(["low", "medium", "high"]),
  reasons: z.array(z.string()),
  evidence: z.array(z.string()),
  storageAdvice: z.string(),
  easyCookingAdvice: z.string(),
  observationSaved: z.boolean(),
  mode: z.enum(["live", "demo"]),
});
