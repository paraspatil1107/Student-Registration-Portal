const express = require('express');
const { body } = require('express-validator');
const {
  getAllStudents,
  getAllRegistrations,
  updateRegistrationStatus,
  getDashboardStats,
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { objectIdParam, handleValidation } = require('../middleware/validate');

const router = express.Router();

router.use(protect, authorizeRoles('admin'));

router.get('/students', getAllStudents);
router.get('/registrations', getAllRegistrations);
router.patch(
  '/registrations/:id',
  objectIdParam('id'),
  body('status').isIn(['registered', 'dropped', 'completed']).withMessage('Status must be registered, dropped or completed.'),
  handleValidation,
  updateRegistrationStatus
);
router.get('/dashboard', getDashboardStats);

module.exports = router;
