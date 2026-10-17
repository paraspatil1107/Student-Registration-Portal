const express = require('express');
const { joinWaitlist, getMyWaitlist, leaveWaitlist } = require('../controllers/waitlistController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, authorizeRoles('student'), joinWaitlist);
router.get('/my-waitlist', protect, authorizeRoles('student'), getMyWaitlist);
router.delete('/:courseId', protect, authorizeRoles('student'), leaveWaitlist);

module.exports = router;
