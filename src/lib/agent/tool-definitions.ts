export const groceryTools = [
  {
    type: "function" as const,
    name: "get_user_profile",
    description: "读取当前用户画像。做个性化购买判断前应调用。",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function" as const,
    name: "query_price_history",
    description: "查询用户过去亲自看到的同类食材价格。比较价格前应调用。",
    parameters: {
      type: "object",
      properties: {
        food_name: { type: "string" },
        limit: { type: "number" },
      },
      required: ["food_name", "limit"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function" as const,
    name: "query_inventory",
    description: "查询用户当前是否已有该食材。给出购买建议前应调用。",
    parameters: {
      type: "object",
      properties: { food_name: { type: "string" } },
      required: ["food_name"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function" as const,
    name: "query_public_reference_prices",
    description: "查询指定城市、指定口径的公开价格参考。不可将批发价冒充零售价。",
    parameters: {
      type: "object",
      properties: {
        food_name: { type: "string" },
        city: { type: ["string", "null"] },
        unit: { type: ["string", "null"] },
      },
      required: ["food_name", "city", "unit"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function" as const,
    name: "save_price_observation",
    description: "保存用户本次实际看到的价格。只有识别出食材、价格和单位时才调用。",
    parameters: {
      type: "object",
      properties: {
        food_name: { type: "string" },
        price: { type: "number" },
        unit: { type: "string" },
        store: { type: ["string", "null"] },
        city: { type: ["string", "null"] },
        observed_at: { type: ["string", "null"] },
      },
      required: ["food_name", "price", "unit", "store", "city", "observed_at"],
      additionalProperties: false,
    },
    strict: true,
  },
];
