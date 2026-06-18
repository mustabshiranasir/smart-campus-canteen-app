import WalletTransaction from '../models/WalletTransaction.js';

/**
 * Log a wallet transaction (topup, debit, refund).
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.amount
 * @param {string} params.type - 'topup' | 'debit' | 'refund'
 * @param {string} [params.paymentMethod]
 * @param {string} [params.reference]
 * @param {string} [params.note]
 * @param {number} params.balanceAfter
 * @returns {Promise<Document>}
 */
export const logWalletTransaction = async ({
  userId,
  amount,
  type,
  paymentMethod = '',
  reference = '',
  note = '',
  balanceAfter,
}) => {
  return WalletTransaction.create({
    userId,
    amount,
    type,
    paymentMethod,
    reference,
    note,
    balanceAfter,
  });
};
