require('dotenv').config();
const app = require('./src/app');
const { connectDB } = require('./src/config/db');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and set a secret.');
  process.exit(1);
}

const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
