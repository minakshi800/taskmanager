const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { queryOne, runSql } = require('../db/database');
const { authenticate, generateToken } = require('../middleware/auth');
const { signupValidation, loginValidation } = require('../utils/validators');

const AVATAR_COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#8b5cf6', '#14b8a6'];

// POST /api/auth/signup
router.post('/signup', signupValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const avatar_color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const result = await runSql(
      'INSERT INTO users (name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?)',
      [name, email, password_hash, avatar_color],
      true
    );

    const user = { id: result.lastInsertRowid, name, email, avatar_color };
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', loginValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      user: { id: user.id, name: user.name, email: user.email, avatar_color: user.avatar_color },
      token,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await queryOne(
      'SELECT id, name, email, avatar_color, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
