// Replica la tabla comparativa real de info.pedix.app/es/#precios
// (ver 01_analisis_pedix.md, sección 5, para la fuente de cada límite/flag)

export type PlanId = "PRINCIPIANTE" | "ESPECIALISTA" | "PRO";

export interface PlanConfig {
  id: PlanId;
  label: string;
  priceUsd: number;
  tagline: string;
  maxImagesPerProduct: number;
  coupons: boolean;
  promotions: boolean;
  dynamicCategories: boolean;
  sku: boolean;
  advancedStock: boolean;
  bulkEdit: boolean;
  bulkImageUpload: boolean;
  userRoles: boolean;
  pointOfSale: boolean;
  autoThermalPrint: boolean;
  deliveryZonesByDistance: boolean;
  googleAnalytics: boolean;
  facebookPixel: boolean;
  googleTagManager: boolean;
  advancedStats: boolean;
  customDomain: boolean;
  managementSystemIntegrations: boolean;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  PRINCIPIANTE: {
    id: "PRINCIPIANTE",
    label: "Principiante",
    priceUsd: 9,
    tagline: "Profesionaliza tus ventas por WhatsApp con un sistema ordenado",
    maxImagesPerProduct: 1,
    coupons: false,
    promotions: false,
    dynamicCategories: false,
    sku: false,
    advancedStock: false,
    bulkEdit: false,
    bulkImageUpload: false,
    userRoles: false,
    pointOfSale: false,
    autoThermalPrint: false,
    deliveryZonesByDistance: false,
    googleAnalytics: false,
    facebookPixel: false,
    googleTagManager: false,
    advancedStats: false,
    customDomain: false,
    managementSystemIntegrations: false,
  },
  ESPECIALISTA: {
    id: "ESPECIALISTA",
    label: "Especialista",
    priceUsd: 16,
    tagline: "Optimiza y escala tu operación de ventas con datos estratégicos",
    maxImagesPerProduct: 3,
    coupons: true,
    promotions: false,
    dynamicCategories: true,
    sku: true,
    advancedStock: true,
    bulkEdit: false,
    bulkImageUpload: false,
    userRoles: false,
    pointOfSale: false,
    autoThermalPrint: true,
    deliveryZonesByDistance: false,
    googleAnalytics: true,
    facebookPixel: true,
    googleTagManager: true,
    advancedStats: false,
    customDomain: false,
    managementSystemIntegrations: false,
  },
  PRO: {
    id: "PRO",
    label: "Pro",
    priceUsd: 23,
    tagline: "Herramientas avanzadas para liderar tu mercado",
    maxImagesPerProduct: 10,
    coupons: true,
    promotions: true,
    dynamicCategories: true,
    sku: true,
    advancedStock: true,
    bulkEdit: true,
    bulkImageUpload: true,
    userRoles: true,
    pointOfSale: true,
    autoThermalPrint: true,
    deliveryZonesByDistance: true,
    googleAnalytics: true,
    facebookPixel: true,
    googleTagManager: true,
    advancedStats: true,
    customDomain: true,
    managementSystemIntegrations: true,
  },
};

export function getPlan(planId: string): PlanConfig {
  return PLANS[planId as PlanId] ?? PLANS.PRINCIPIANTE;
}
