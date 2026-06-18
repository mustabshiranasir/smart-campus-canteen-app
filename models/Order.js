import mongoose from 'mongoose';

const orderExtraSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  selectedExtras: { type: [orderExtraSchema], default: [] },
  unitPrice: { type: Number },
  lineTotal: { type: Number },
});

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending_approval', 'pending', 'preparing', 'ready', 'completed', 'delivered', 'cancelled', 'no-show'], default: 'pending' },
    priority: { type: Number, enum: [1, 2], default: 2 }, // 1 = faculty (high), 2 = student
    paymentMethod: { type: String, required: true, default: 'wallet' },
    deliveryAddress: { type: String, default: '' },
    pickupLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    shareLiveLocation: { type: Boolean, default: false },
    
    // Bulk order approval
    requiresAdminApproval: { type: Boolean, default: false },
    adminApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
