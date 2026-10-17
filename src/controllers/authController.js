const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');

const toPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  maxCredits: user.maxCredits,
  createdAt: user.createdAt,
});

// Public sign-up always creates a student; admins are created with `npm run seed`.
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'student',
    });

    res.status(201).json({ token: generateToken(user), user: toPublicUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    res.json({ token: generateToken(user), user: toPublicUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Login failed.', error: error.message });
  }
};

const getMe = async (req, res) => {
  res.json({ user: toPublicUser(req.user) });
};

module.exports = { registerUser, loginUser, getMe };
