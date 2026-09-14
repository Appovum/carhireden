// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Meta Template Variable Interpolator
// Substitutes template variables: {store_name}, {discount_text}, {current_year}, {total_coupons}.
// ═══════════════════════════════════════════════════════════════════

export interface MetaVariables {
  store_name?: string;
  discount_text?: string;
  total_coupons?: number;
  category_name?: string;
}

export function buildMetaTitle(template: string, vars: MetaVariables): string {
  const currentYear = new Date().getFullYear().toString();

  return template
    .replace(/\{store_name\}/gi, vars.store_name || "Store")
    .replace(/\{discount_text\}/gi, vars.discount_text || "Best Deals")
    .replace(/\{total_coupons\}/gi, String(vars.total_coupons || 0))
    .replace(/\{category_name\}/gi, vars.category_name || "Category")
    .replace(/\{current_year\}/gi, currentYear);
}

export function buildMetaDescription(template: string, vars: MetaVariables): string {
  return buildMetaTitle(template, vars);
}
