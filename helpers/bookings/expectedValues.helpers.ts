/** Expected values derived from what the API saved. Generated input comes from the `dataFactory` fixture (data/factories.ts). */

/** How the UI displays a price: USD without decimals (e.g. "1500" -> "$1,500"). */
export function formatDisplayedPrice(amount: number | string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(amount));
}

/** price × quantity computed in cents, so 99.99 × 3 is exactly 299.97 rather than 299.96999999999997. */
export function calculateExpectedTotal(price: number | string, quantity: number): number {
  return (Math.round(Number(price) * 100) * quantity) / 100;
}
