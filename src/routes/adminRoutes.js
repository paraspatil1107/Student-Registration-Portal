const express = require('express');
const { getAllStudents, getAllRegistrations, getDashboardStats } = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/students', protect, authorizeRoles('admin'), getAllStudents);
router.get('/registrations', protect, authorizeRoles('admin'), getAllRegistrations);
router.get('/dashboard', protect, authorizeRoles('admin'), getDashboardStats);

module.exports = router;
