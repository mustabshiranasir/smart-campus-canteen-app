import mongoose from 'mongoose';

const extraOptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    maxQuantity: { type: Number, default: 3, min: 1 },
  },
  { _id: false }
);

const foodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    imageUrl: { type: String },
    status: { type: String, enum: ['available', 'unavailable'], default: 'available' },
    stock: { type: Number, default: 99 },
    description: { type: String, default: '' },
    extras: { type: [extraOptionSchema], default: [] },
    dietary: { type: [String], default: [] },
    nutrition: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 }
    },
    rating: { type: Number, default: 4.5 },
    numReviews: { type: Number, default: 1 },
    ratings: {
      type: [{
        userId: { type: String, required: true },
        rating: { type: Number, required: true, min: 1, max: 5 }
      }],
      default: []
    }
  },
  { timestamps: true }
);

const Food = mongoose.model('Food', foodSchema);
export default Food;
