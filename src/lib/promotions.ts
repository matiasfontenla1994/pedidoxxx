// Cálculo de promociones automáticas tipo "llevando N pagás M" (2x1, 3x2, etc.)
// Sin dependencias de DB: se puede usar tanto en el server (checkout, POS) como en el cliente (preview del carrito).

export type PromotionScope = "ALL" | "CATEGORY" | "PRODUCT";

export interface PromotionRule {
  id: string;
  name: string;
  scope: PromotionScope;
  scopeId: string | null;
  buyQty: number;
  payQty: number;
}

export interface PromoLine {
  productId: string;
  categoryId: string | null;
  unitPrice: number;
  quantity: number;
}

export interface PromotionResult {
  discount: number;
  appliedNames: string[];
}

export function calculatePromotionDiscount(
  lines: PromoLine[],
  promotions: PromotionRule[]
): PromotionResult {
  if (promotions.length === 0 || lines.length === 0) return { discount: 0, appliedNames: [] };

  const productPromos = promotions.filter((p) => p.scope === "PRODUCT");
  const categoryPromos = promotions.filter((p) => p.scope === "CATEGORY");
  const allPromos = promotions.filter((p) => p.scope === "ALL");

  function matchFor(line: PromoLine): PromotionRule | undefined {
    return (
      productPromos.find((p) => p.scopeId === line.productId) ??
      (line.categoryId ? categoryPromos.find((p) => p.scopeId === line.categoryId) : undefined) ??
      allPromos[0]
    );
  }

  // Cada producto se asocia a lo sumo a una promoción (la más específica: producto > categoría > general),
  // para no acumular varios descuentos sobre las mismas unidades.
  const unitsByPromo = new Map<string, number[]>();
  for (const line of lines) {
    const promo = matchFor(line);
    if (!promo) continue;
    const arr = unitsByPromo.get(promo.id) ?? [];
    for (let i = 0; i < line.quantity; i++) arr.push(line.unitPrice);
    unitsByPromo.set(promo.id, arr);
  }

  let discount = 0;
  const appliedNames: string[] = [];
  for (const [promoId, units] of unitsByPromo) {
    const promo = promotions.find((p) => p.id === promoId);
    if (!promo) continue;
    const freeQtyPerGroup = promo.buyQty - promo.payQty;
    if (freeQtyPerGroup <= 0) continue;
    units.sort((a, b) => a - b);
    const groups = Math.floor(units.length / promo.buyQty);
    if (groups === 0) continue;

    let groupDiscount = 0;
    for (let g = 0; g < groups; g++) {
      const start = g * promo.buyQty;
      const freeSlice = units.slice(start, start + freeQtyPerGroup);
      groupDiscount += freeSlice.reduce((s, p) => s + p, 0);
    }
    if (groupDiscount > 0) {
      discount += groupDiscount;
      appliedNames.push(promo.name);
    }
  }
  return { discount, appliedNames };
}
