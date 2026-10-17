const express = require('express');
const { addToWishlist, getWishlist, removeFromWishlist } = require('../controllers/wishlistController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, authorizeRoles('student'), addToWishlist);
router.get('/', protect, authorizeRoles('student'), getWishlist);
router.delete('/:courseId', protect, authorizeRoles('student'), removeFromWishlist);

module.exports = router;
