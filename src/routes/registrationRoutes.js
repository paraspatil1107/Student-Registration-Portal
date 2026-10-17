const express = require('express');
const { registerForCourse, getMyCourses, dropCourse, getRegistrationHistory } = require('../controllers/registrationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { objectIdParam, courseIdBody } = require('../middleware/validate');

const router = express.Router();

router.use(protect, authorizeRoles('student'));

router.post('/', courseIdBody, registerForCourse);
router.get('/my-courses', getMyCourses);
router.get('/history', getRegistrationHistory);
router.delete('/:courseId', objectIdParam('courseId'), dropCourse);

module.exports = router;
