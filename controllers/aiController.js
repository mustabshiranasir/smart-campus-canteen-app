import Food from '../models/Food.js';
import Order from '../models/Order.js';
import { getFoods } from './foodController.js';
import { addToCart } from './cartController.js';
import { getOrders } from './orderController.js';
import { getDefaultExtrasForFood } from '../utils/foodExtrasPresets.js';

const withExtras = (foodDoc) => {
  const obj = foodDoc.toObject ? foodDoc.toObject() : foodDoc;
  if (!obj.extras || obj.extras.length === 0) {
    obj.extras = getDefaultExtrasForFood(obj);
  }
  return obj;
};

// @desc    Get recommendations for the current student
// @route   GET /api/ai/recommendations
// @access  Private
export const getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Aggregate student's most-reordered items
    const userOrdered = await Order.aggregate([
      { $match: { userId } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', totalQty: { $sum: '$items.quantity' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 5 }
    ]);

    // Aggregate top 3 most popular items overall
    const popularOverall = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', totalQty: { $sum: '$items.quantity' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 3 }
    ]);

    const userOrderedIds = userOrdered.map(item => item._id);
    const popularIds = popularOverall.map(item => item._id);

    // Fetch the Food documents
    const userFoods = await Food.find({ _id: { $in: userOrderedIds } });
    const popularFoods = await Food.find({ _id: { $in: popularIds } });

    // Preserving order from aggregations
    const recommendedForYou = userOrderedIds
      .map(id => userFoods.find(f => f._id.toString() === id.toString()))
      .filter(Boolean)
      .map(withExtras);

    const popularOverallItems = popularIds
      .map(id => popularFoods.find(f => f._id.toString() === id.toString()))
      .filter(Boolean)
      .map(withExtras);

    res.status(200).json({
      success: true,
      data: {
        recommendedForYou,
        popularOverall: popularOverallItems
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper to normalize different history shapes to Gemini format
const normalizeHistory = (incomingHistory) => {
  if (!Array.isArray(incomingHistory)) return [];

  return incomingHistory.map(item => {
    // Already in Gemini role/parts format
    if (item.role && Array.isArray(item.parts)) {
      return {
        role: item.role,
        parts: item.parts.map(p => {
          if (p.text) return { text: p.text };
          if (p.functionCall) return { functionCall: p.functionCall };
          if (p.functionResponse) return { functionResponse: p.functionResponse };
          return p;
        })
      };
    }
    // OpenAI/standard format: { role: 'user'/'assistant', content: '...' }
    if (item.role && item.content) {
      const role = (item.role === 'assistant' || item.role === 'model') ? 'model' : 'user';
      return {
        role,
        parts: [{ text: item.content }]
      };
    }
    // Custom format: { sender: 'user'/'bot', text: '...' }
    if (item.sender && item.text) {
      const role = item.sender === 'user' ? 'user' : 'model';
      return {
        role,
        parts: [{ text: item.text }]
      };
    }
    return null;
  }).filter(Boolean);
};

// Helper to invoke a controller and return its raw output
const callController = async (controllerFn, req, reqData) => {
  let responseStatus = 200;
  let responseData = null;
  let nextError = null;

  const mockReq = {
    user: req.user,
    headers: req.headers,
    ...reqData
  };

  const mockRes = {
    status(code) {
      responseStatus = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  const mockNext = (err) => {
    nextError = err;
  };

  try {
    await controllerFn(mockReq, mockRes, mockNext);
  } catch (err) {
    nextError = err;
  }

  if (nextError) {
    throw nextError;
  }

  return { status: responseStatus, data: responseData };
};

// Handlers for tool calls
const handleSearchFoods = async (args, req) => {
  const { category, maxPrice, availability } = args;
  const result = await callController(getFoods, req, {});
  if (!result.data || !result.data.success) {
    return { success: false, message: 'Could not fetch foods' };
  }
  let foods = result.data.data;
  if (category) {
    const lower = category.toLowerCase();
    foods = foods.filter(f =>
      f.category.toLowerCase().includes(lower) ||
      f.name.toLowerCase().includes(lower)
    );
  }
  if (maxPrice !== undefined) {
    foods = foods.filter(f => f.price <= maxPrice);
  }
  if (availability) {
    if (availability === 'available') {
      foods = foods.filter(f => f.status === 'available');
    } else if (availability === 'unavailable') {
      foods = foods.filter(f => f.status === 'unavailable');
    }
  }
  return foods.map(f => ({
    productId: f._id,
    name: f.name,
    price: f.price,
    category: f.category,
    status: f.status,
    stock: f.stock,
    description: f.description,
    extras: f.extras
  }));
};

const handleAddToCart = async (args, req) => {
  const { productId, quantity = 1, selectedExtras = [] } = args;
  const body = {
    productId,
    quantity: Number(quantity),
    selectedExtras: Array.isArray(selectedExtras) ? selectedExtras : []
  };
  const result = await callController(addToCart, req, { body });
  return result.data;
};

const handleGetPastOrders = async (args, req) => {
  const result = await callController(getOrders, req, {});
  return result.data;
};

// Tools definitions
const searchFoodsTool = {
  name: 'searchFoods',
  description: 'Search for food items in the canteen menu by category, maximum price, or availability.',
  parameters: {
    type: 'OBJECT',
    properties: {
      category: {
        type: 'STRING',
        description: 'The category of food to search for (e.g. Pizza, Burger, Drinks, Desserts, Chinese, etc.).'
      },
      maxPrice: {
        type: 'NUMBER',
        description: 'The maximum price in Rupees (Rs.) the food item can cost.'
      },
      availability: {
        type: 'STRING',
        enum: ['available', 'unavailable', 'any'],
        description: 'Filter by availability status.'
      }
    }
  }
};

const addToCartTool = {
  name: 'addToCart',
  description: 'Add a food item to the student\'s shopping cart. Make sure to first search for the food item using searchFoods to get the correct productId.',
  parameters: {
    type: 'OBJECT',
    properties: {
      productId: {
        type: 'STRING',
        description: 'The unique MongoDB ObjectId of the food item.'
      },
      quantity: {
        type: 'NUMBER',
        description: 'The quantity of the item to add. Default is 1.'
      },
      selectedExtras: {
        type: 'ARRAY',
        description: 'Optional list of extras/add-ons chosen by the user.',
        items: {
          type: 'OBJECT',
          properties: {
            name: {
              type: 'STRING',
              description: 'The name of the extra option.'
            },
            price: {
              type: 'NUMBER',
              description: 'The price of the extra option.'
            },
            quantity: {
              type: 'NUMBER',
              description: 'The quantity of this extra option. Default is 1.'
            }
          },
          required: ['name', 'price']
        }
      }
    },
    required: ['productId']
  }
};

const getPastOrdersTool = {
  name: 'getPastOrders',
  description: 'Retrieve the student\'s past and active orders to answer questions about their ordering history and status.',
  parameters: {
    type: 'OBJECT',
    properties: {}
  }
};

// @desc    AI Assistant chat chat endpoint
// @route   POST /api/ai/chat
// @access  Private
export const chatWithAssistant = async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Please provide a message' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.'
      });
    }

    const normalizedHistory = normalizeHistory(history);
    normalizedHistory.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const systemInstruction = {
      parts: [
        {
          text: `You are a helpful, friendly, and efficient AI Ordering Assistant for the Smart Canteen. 
You assist students with ordering food, searching the canteen menu, checking item availability/price, managing their cart, and querying their past orders.

Guidelines:
1. When a user asks to search for food (e.g. by category, name, or price), always use the "searchFoods" tool. Do not try to answer from memory.
2. When a user wants to add an item to their cart, you MUST first call "searchFoods" to verify the food item exists, get its correct "productId", and check its price and stock. Do NOT guess or make up a productId.
3. Once you have the valid "productId", call the "addToCart" tool with the productId, quantity, and any chosen extras.
4. When a user asks about their past orders, order status, or order history, use the "getPastOrders" tool.
5. Keep your tone polite, concise, and helpful. Always confirm actions to the user (e.g., when an item is added to the cart).
6. State prices in Rupees (Rs.).`
        }
      ]
    };

    const tools = [
      {
        function_declarations: [
          searchFoodsTool,
          addToCartTool,
          getPastOrdersTool
        ]
      }
    ];

    let currentContents = [...normalizedHistory];
    let finalMessage = '';
    let attempts = 0;
    const maxAttempts = 6;

    while (attempts < maxAttempts) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: currentContents,
          systemInstruction,
          tools
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        return res.status(500).json({
          success: false,
          message: responseData?.error?.message || 'Gemini API execution failed'
        });
      }

      const candidate = responseData?.candidates?.[0];
      const modelContent = candidate?.content;
      if (!modelContent) {
        return res.status(500).json({
          success: false,
          message: 'Empty response from Gemini model.'
        });
      }

      currentContents.push(modelContent);

      const part = modelContent.parts?.[0];
      if (part && part.functionCall) {
        const { name, args } = part.functionCall;
        let functionResult;

        try {
          if (name === 'searchFoods') {
            functionResult = await handleSearchFoods(args, req);
          } else if (name === 'addToCart') {
            functionResult = await handleAddToCart(args, req);
          } else if (name === 'getPastOrders') {
            functionResult = await handleGetPastOrders(args, req);
          } else {
            functionResult = { success: false, message: `Function ${name} is not supported.` };
          }
        } catch (error) {
          functionResult = { success: false, message: error.message };
        }

        currentContents.push({
          role: 'function',
          parts: [
            {
              functionResponse: {
                name,
                response: { result: functionResult }
              }
            }
          ]
        });

        attempts++;
      } else {
        finalMessage = part?.text || '';
        break;
      }
    }

    res.status(200).json({
      success: true,
      message: finalMessage,
      history: currentContents
    });
  } catch (error) {
    next(error);
  }
};
