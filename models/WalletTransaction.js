import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['topup', 'debit', 'refund'], required: true },
    paymentMethod: { type: String, default: '' },
    reference: { type: String, default: '' },
    note: { type: String, default: '' },
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: true }
);

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);
export default WalletTransaction;
