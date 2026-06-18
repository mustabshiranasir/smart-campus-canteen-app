import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String },
    available: { type: Boolean, default: true },
    stock: { type: Number, default: 99 },
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);
export default Product;
