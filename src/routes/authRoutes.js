const express = require('express');
const rateLimit = require('express-rate-limit');
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { registerRules, loginRules } = require('../middleware/validate');

const router = express.Router();

// Slows down password guessing: 20 attempts per IP every 15 minutes.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
});

router.post('/register', authLimiter, registerRules, registerUser);
router.post('/login', authLimiter, loginRules, loginUser);
router.get('/me', protect, getMe);

module.exports = router;
