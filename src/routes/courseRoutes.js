const express = require('express');
const { getCourses, getCourseById, addCourse, updateCourse, deleteCourse } = require('../controllers/courseController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { objectIdParam, courseRules } = require('../middleware/validate');

const router = express.Router();

router.get('/', getCourses);
router.get('/:id', objectIdParam('id'), getCourseById);
router.post('/', protect, authorizeRoles('admin'), courseRules(), addCourse);
router.put('/:id', protect, authorizeRoles('admin'), objectIdParam('id'), courseRules(true), updateCourse);
router.delete('/:id', protect, authorizeRoles('admin'), objectIdParam('id'), deleteCourse);

module.exports = router;
