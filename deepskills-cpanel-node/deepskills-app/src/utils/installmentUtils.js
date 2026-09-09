/**
 * Installment Calculation Utility
 *
 * Calculates installment amounts ensuring that:
 * 1. Every installment is an integer amount (Rs.)
 * 2. The sum of all installments ALWAYS strictly equals totalAmount (zero rupee discrepancy)
 * 3. Base amount is evenly divided, and remainder is allocated to the final installment.
 *
 * Example:
 * calculateInstallments(25000, 3) => [8333, 8333, 8334] (sum: 25000)
 * calculateInstallments(30000, 4) => [7500, 7500, 7500, 7500] (sum: 30000)
 * calculateInstallments(10000, 6) => [1666, 1666, 1666, 1666, 1666, 1670] (sum: 10000)
 * calculateInstallments(1, 3) => [0, 0, 1] (sum: 1)
 */

export function calculateInstallments(totalAmount, count) {
  const total = Math.max(0, Math.round(Number(totalAmount) || 0));
  const n = Math.max(1, Math.round(Number(count) || 1));

  if (n === 1) {
    return [total];
  }

  const base = Math.floor(total / n);
  const installments = [];

  for (let i = 0; i < n; i++) {
    if (i === n - 1) {
      // Final installment absorbs any remainder so sum exactly equals total
      installments.push(total - (base * (n - 1)));
    } else {
      installments.push(base);
    }
  }

  return installments;
}
