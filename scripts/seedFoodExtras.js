import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Food from '../models/Food.js';
import { getDefaultExtrasForFood } from '../utils/foodExtrasPresets.js';

dotenv.config();

const seed = async () => {
  await connectDB();
  const foods = await Food.find({});
  let updated = 0;

  for (const food of foods) {
    if (!food.extras || food.extras.length === 0) {
      food.extras = getDefaultExtrasForFood(food);
      await food.save();
      updated += 1;
      console.log(`✓ ${food.name}: ${food.extras.length} add-ons`);
    }
  }

  console.log(`\nDone. Updated ${updated} of ${foods.length} food items.`);
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
