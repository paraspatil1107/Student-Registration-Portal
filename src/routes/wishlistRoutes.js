const express = require('express');
const { addToWishlist, getWishlist, removeFromWishlist } = require('../controllers/wishlistController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { objectIdParam, courseIdBody } = require('../middleware/validate');

const router = express.Router();

router.use(protect, authorizeRoles('student'));

router.post('/', courseIdBody, addToWishlist);
router.get('/', getWishlist);
router.delete('/:courseId', objectIdParam('courseId'), removeFromWishlist);

module.exports = router;
