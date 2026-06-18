import User from '../models/User.js';
import { logWalletTransaction } from '../utils/walletLog.js';

// @desc    Top up wallet balance
// @route   POST /api/wallet/topup
// @access  Private
export const topupWallet = async (req, res, next) => {
  try {
    const { amount, paymentMethod, note } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount. Please provide a positive number.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.walletBalance = Math.round((user.walletBalance || 0) + parsedAmount);
    await user.save();

    await logWalletTransaction({
      userId: user._id,
      amount: parsedAmount,
      type: 'topup',
      paymentMethod: paymentMethod || 'wallet',
      note: note || 'Wallet top-up',
      balanceAfter: user.walletBalance,
    });

    res.status(200).json({
      success: true,
      message: 'Wallet topped up successfully',
      data: {
        userId: user._id,
        walletBalance: user.walletBalance
      }
    });
  } catch (error) {
    next(error);
  }
};
