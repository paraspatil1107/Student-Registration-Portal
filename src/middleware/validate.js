const mongoose = require('mongoose');
const { body, param, validationResult } = require('express-validator');

// Responds 400 with every validation message if any rule before it failed.
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array().map((e) => e.msg).join(' '),
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const objectIdParam = (name) => [param(name).custom(isObjectId).withMessage(`Invalid ${name}.`), handleValidation];

const courseIdBody = [
  body('courseId')
    .exists({ values: 'falsy' })
    .withMessage('Course ID is required.')
    .bail()
    .custom(isObjectId)
    .withMessage('Invalid course ID.'),
  handleValidation,
];

const emailRule = () => body('email').trim().isEmail().withMessage('Enter a valid email.').bail().toLowerCase();

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters.'),
  emailRule(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .bail()
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain a letter.')
    .bail()
    .matches(/\d/)
    .withMessage('Password must contain a number.'),
  handleValidation,
];

const loginRules = [emailRule(), body('password').notEmpty().withMessage('Password is required.'), handleValidation];

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// `partial` is true for updates, where any subset of fields may be sent.
const courseRules = (partial = false) => {
  const field = (name) => (partial ? body(name).optional() : body(name));
  return [
    field('courseCode').trim().matches(/^[A-Za-z]{2,6}\d{2,4}$/).withMessage('Course code must look like CS101.'),
    field('courseName').trim().isLength({ min: 3, max: 100 }).withMessage('Course name must be 3-100 characters.'),
    field('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters.'),
    field('credits').isInt({ min: 1, max: 6 }).withMessage('Credits must be a whole number from 1 to 6.').toInt(),
    field('instructor').trim().isLength({ min: 2, max: 60 }).withMessage('Instructor must be 2-60 characters.'),
    field('capacity').isInt({ min: 1, max: 500 }).withMessage('Capacity must be a whole number from 1 to 500.').toInt(),
    body('department').optional().trim().isLength({ max: 60 }).withMessage('Department is too long.'),
    body('semester').optional().trim().isLength({ max: 30 }).withMessage('Semester is too long.'),
    body('status').optional().isIn(['active', 'inactive', 'closed']).withMessage('Status must be active, inactive or closed.'),
    body('prerequisites').optional().isArray().withMessage('Prerequisites must be a list of course IDs.'),
    body('prerequisites.*').custom(isObjectId).withMessage('Invalid prerequisite course ID.'),
    body('schedule.days').optional().isArray().withMessage('Schedule days must be a list.'),
    body('schedule.days.*').isIn(DAYS).withMessage(`Schedule days must be one of ${DAYS.join(', ')}.`),
    body('schedule.startTime').optional({ values: 'falsy' }).matches(TIME).withMessage('Start time must be HH:MM.'),
    body('schedule.endTime').optional({ values: 'falsy' }).matches(TIME).withMessage('End time must be HH:MM.'),
    body('schedule.location').optional().trim().isLength({ max: 40 }).withMessage('Location is too long.'),
    body('schedule').optional().custom((schedule) => {
      if (schedule && schedule.startTime && schedule.endTime && schedule.startTime >= schedule.endTime) {
        throw new Error('End time must be after start time.');
      }
      return true;
    }),
    handleValidation,
  ];
};

module.exports = { handleValidation, objectIdParam, courseIdBody, registerRules, loginRules, courseRules };
