const { body } = require('express-validator');

const signupValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

const projectValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Project name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Project name must be 2-100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must be under 500 characters'),
];

const taskValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Task title is required')
    .isLength({ min: 2, max: 200 }).withMessage('Title must be 2-200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must be under 1000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'done']).withMessage('Status must be todo, in_progress, or done'),
  body('assigned_to')
    .optional({ nullable: true })
    .isInt().withMessage('assigned_to must be a user ID'),
  body('due_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('due_date must be a valid date'),
];

const statusValidation = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['todo', 'in_progress', 'done']).withMessage('Status must be todo, in_progress, or done'),
];

const memberValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(['admin', 'member']).withMessage('Role must be admin or member'),
];

module.exports = {
  signupValidation,
  loginValidation,
  projectValidation,
  taskValidation,
  statusValidation,
  memberValidation,
};
