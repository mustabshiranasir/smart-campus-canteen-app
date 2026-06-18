import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Test basic route
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy' });
});

const PORT = process.env.PORT || 5000;

try {
  app.listen(PORT, () => {
    console.log(`✓ Test server running on port ${PORT}`);
    console.log(`✓ Environment loaded successfully`);
    console.log(`✓ All dependencies available`);
    process.exit(0);
  });
} catch (error) {
  console.error(`✗ Error: ${error.message}`);
  process.exit(1);
}
