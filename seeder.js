import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import Food from './models/Food.js';
import connectDB from './config/db.js';

dotenv.config();

connectDB();

const products = [
  { name: 'Burger', description: 'Delicious chicken burger', price: 250, category: 'Fast Food', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=500&fit=crop' },
  { name: 'Pizza', description: 'Cheese and pepperoni pizza', price: 450, category: 'Fast Food', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&h=500&fit=crop' },
  { name: 'Pasta', description: 'Creamy alfredo pasta', price: 350, category: 'Italian', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=500&h=500&fit=crop' },
  { name: 'Salad', description: 'Healthy green salad', price: 200, category: 'Healthy', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=500&fit=crop' },
  { name: 'Fries', description: 'Crispy french fries', price: 150, category: 'Sides', image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&h=500&fit=crop' },
  { name: 'Coke', description: 'Chilled Coca-Cola', price: 80, category: 'Beverages', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&h=500&fit=crop' },
  { name: 'Coffee', description: 'Hot brewed coffee', price: 120, category: 'Beverages', image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=500&h=500&fit=crop' },
  { name: 'Sandwich', description: 'Club sandwich', price: 180, category: 'Snacks', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&h=500&fit=crop' },
  { name: 'Wrap', description: 'Chicken wrap', price: 220, category: 'Snacks', image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&h=500&fit=crop' },
  { name: 'Ice Cream', description: 'Vanilla ice cream', price: 140, category: 'Desserts', image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=500&h=500&fit=crop' },
  { name: 'Brownie', description: 'Chocolate brownie', price: 160, category: 'Desserts', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&h=500&fit=crop' },
  { name: 'Smoothie', description: 'Mango smoothie', price: 200, category: 'Beverages', image: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=500&h=500&fit=crop' },
  { name: 'Tacos', description: 'Spicy chicken tacos', price: 280, category: 'Mexican', image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=500&h=500&fit=crop' },
  { name: 'Sushi', description: 'Salmon sushi roll', price: 650, category: 'Asian', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&h=500&fit=crop' },
  { name: 'Noodles', description: 'Stir-fried noodles', price: 240, category: 'Asian', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&h=500&fit=crop' },
];

const seedData = async () => {
  try {
    // Seed Products
    await Product.deleteMany();
    await Product.insertMany(products);
    console.log('✓ Products Seeded Successfully');

    // Seed Foods
    await Food.deleteMany();
    
    const DIETARY_MAPPING = {
      'Burger': { dietary: [], nutrition: { calories: 450, protein: 18, carbs: 40, fat: 22 } },
      'Pizza': { dietary: ['vegetarian'], nutrition: { calories: 290, protein: 12, carbs: 32, fat: 12 } },
      'Pasta': { dietary: ['vegetarian'], nutrition: { calories: 380, protein: 10, carbs: 55, fat: 14 } },
      'Salad': { dietary: ['vegan', 'gluten-free', 'vegetarian'], nutrition: { calories: 120, protein: 3, carbs: 8, fat: 9 } },
      'Fries': { dietary: ['vegan', 'gluten-free', 'vegetarian'], nutrition: { calories: 312, protein: 4, carbs: 41, fat: 15 } },
      'Coke': { dietary: ['vegan', 'gluten-free', 'vegetarian'], nutrition: { calories: 140, protein: 0, carbs: 39, fat: 0 } },
      'Coffee': { dietary: ['gluten-free', 'vegetarian'], nutrition: { calories: 80, protein: 2, carbs: 12, fat: 3 } },
      'Sandwich': { dietary: [], nutrition: { calories: 350, protein: 15, carbs: 30, fat: 16 } },
      'Wrap': { dietary: [], nutrition: { calories: 410, protein: 22, carbs: 45, fat: 18 } },
      'Ice Cream': { dietary: ['gluten-free', 'vegetarian'], nutrition: { calories: 210, protein: 4, carbs: 24, fat: 11 } },
      'Brownie': { dietary: ['vegetarian'], nutrition: { calories: 340, protein: 4, carbs: 46, fat: 16 } },
      'Smoothie': { dietary: ['gluten-free', 'vegetarian'], nutrition: { calories: 180, protein: 3, carbs: 38, fat: 1 } },
      'Tacos': { dietary: ['gluten-free'], nutrition: { calories: 220, protein: 14, carbs: 20, fat: 10 } },
      'Sushi': { dietary: ['gluten-free'], nutrition: { calories: 300, protein: 16, carbs: 50, fat: 3 } },
      'Noodles': { dietary: ['vegetarian'], nutrition: { calories: 320, protein: 8, carbs: 44, fat: 12 } },
    };

    const foodsToSeed = products.map(p => {
      const extraInfo = DIETARY_MAPPING[p.name] || { dietary: [], nutrition: { calories: 250, protein: 8, carbs: 30, fat: 8 } };
      return {
        name: p.name,
        price: p.price,
        category: p.category,
        imageUrl: p.image,
        status: 'available',
        stock: p.stock !== undefined ? p.stock : 99,
        description: p.description,
        dietary: extraInfo.dietary,
        nutrition: extraInfo.nutrition,
        rating: parseFloat((4.0 + Math.random() * 1.0).toFixed(1)),
        numReviews: Math.floor(Math.random() * 20) + 1
      };
    });
    
    await Food.insertMany(foodsToSeed);
    console.log('✓ Foods Seeded Successfully');

    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
