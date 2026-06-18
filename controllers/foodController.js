import Food from '../models/Food.js';
import { getDefaultExtrasForFood } from '../utils/foodExtrasPresets.js';

const withExtras = (foodDoc) => {
  const obj = foodDoc.toObject ? foodDoc.toObject() : foodDoc;
  if (!obj.extras || obj.extras.length === 0) {
    obj.extras = getDefaultExtrasForFood(obj);
  }
  return obj;
};

// @desc    Get all food items
// @route   GET /api/food
// @access  Public/Private (Filters available items for students)
export const getFoods = async (req, res, next) => {
  try {
    let query = {};
    
    // If not authenticated or not an admin, only show available food items
    if (!req.user || req.user.role !== 'admin') {
      query.status = 'available';
    }

    const foods = await Food.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: foods.map(withExtras) });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a food item
// @route   POST /api/food
// @access  Private/Admin
export const createFood = async (req, res, next) => {
  try {
    const { name, price, category, imageUrl, status, stock, description, extras, dietary, nutrition } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ success: false, message: 'Please provide name, price, and category' });
    }

    const food = await Food.create({
      name,
      price: parseFloat(price),
      category,
      imageUrl,
      status: status || 'available',
      stock: stock !== undefined ? Number(stock) : 99,
      description: description || '',
      extras: Array.isArray(extras) && extras.length > 0
        ? extras
        : getDefaultExtrasForFood({ name, category }),
      dietary: dietary || [],
      nutrition: nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    });

    res.status(201).json({ success: true, data: food });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a food item
// @route   PUT /api/food/:id
// @access  Private/Admin
export const updateFood = async (req, res, next) => {
  try {
    const { name, price, category, imageUrl, status, stock, description, extras, dietary, nutrition } = req.body;
    let food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    food.name = name || food.name;
    food.price = price !== undefined ? parseFloat(price) : food.price;
    food.category = category || food.category;
    food.imageUrl = imageUrl || food.imageUrl;
    food.status = status || food.status;
    food.stock = stock !== undefined ? Number(stock) : food.stock;
    food.description = description !== undefined ? description : food.description;
    if (extras !== undefined) food.extras = extras;
    if (dietary !== undefined) food.dietary = dietary;
    if (nutrition !== undefined) food.nutrition = nutrition;

    await food.save();

    res.status(200).json({ success: true, data: food });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a food item
// @route   DELETE /api/food/:id
// @access  Private/Admin
export const deleteFood = async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    await food.deleteOne();

    res.status(200).json({ success: true, message: 'Food item removed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload a food item image
// @route   POST /api/food/upload
// @access  Private/Admin
export const uploadFoodImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const imageUrl = `/uploads/food-items/${req.file.filename}`;
    res.status(200).json({
      success: true,
      message: 'Food image uploaded successfully',
      imageUrl,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Rate a food item
// @route   POST /api/food/:id/rate
// @access  Private
export const rateFood = async (req, res, next) => {
  try {
    const { rating } = req.body;
    const userId = req.user._id.toString();

    if (rating === undefined || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Please provide a rating between 1 and 5' });
    }

    const food = await Food.findById(req.params.id);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    // Initialize ratings array if it doesn't exist
    if (!food.ratings) {
      food.ratings = [];
    }

    // Check if user already rated
    const existingRatingIndex = food.ratings.findIndex(r => r.userId === userId);
    if (existingRatingIndex > -1) {
      food.ratings[existingRatingIndex].rating = rating;
    } else {
      food.ratings.push({ userId, rating });
    }

    // Recalculate average rating and numReviews
    food.numReviews = food.ratings.length;
    const totalRating = food.ratings.reduce((sum, r) => sum + r.rating, 0);
    food.rating = parseFloat((totalRating / food.numReviews).toFixed(1));

    await food.save();

    res.status(200).json({ success: true, data: food });
  } catch (error) {
    next(error);
  }
};
