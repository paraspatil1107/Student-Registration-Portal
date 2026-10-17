const express = require('express');
const { registerForCourse, getMyCourses, dropCourse, getRegistrationHistory } = require('../controllers/registrationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, authorizeRoles('student'), registerForCourse);
router.get('/my-courses', protect, authorizeRoles('student'), getMyCourses);
router.get('/history', protect, authorizeRoles('student'), getRegistrationHistory);
router.delete('/:courseId', protect, authorizeRoles('student'), dropCourse);

module.exports = router;
