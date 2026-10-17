const express = require('express');
const { joinWaitlist, getMyWaitlist, leaveWaitlist } = require('../controllers/waitlistController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { objectIdParam, courseIdBody } = require('../middleware/validate');

const router = express.Router();

router.use(protect, authorizeRoles('student'));

router.post('/', courseIdBody, joinWaitlist);
router.get('/my-waitlist', getMyWaitlist);
router.delete('/:courseId', objectIdParam('courseId'), leaveWaitlist);

module.exports = router;
