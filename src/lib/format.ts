export function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toFixed(2)}`;
}
