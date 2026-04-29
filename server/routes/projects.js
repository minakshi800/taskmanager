const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const { queryAll, queryOne, runSql, transaction } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { requireProjectMember, requireProjectAdmin } = require('../middleware/rbac');
const { projectValidation, memberValidation } = require('../utils/validators');

router.use(authenticate);

// GET /api/projects
router.get('/', async (req, res, next) => {
  try {
    const projects = await queryAll(`
      SELECT p.*, pm.role as user_role,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
        u.name as creator_name
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      JOIN users u ON u.id = p.created_by
      ORDER BY p.created_at DESC
    `, [req.user.id]);

    // Ensure numeric values are integers, as postgres COUNT returns strings
    const formattedProjects = projects.map(p => ({
      ...p,
      task_count: parseInt(p.task_count, 10),
      done_count: parseInt(p.done_count, 10),
      member_count: parseInt(p.member_count, 10),
    }));

    res.json({ projects: formattedProjects });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects
router.post('/', projectValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description } = req.body;

  try {
    const projectId = await transaction(async (client) => {
      const projRes = await client.query(
        'INSERT INTO projects (name, description, created_by) VALUES ($1, $2, $3) RETURNING id',
        [name, description || '', req.user.id]
      );
      const newProjectId = projRes.rows[0].id;
      
      await client.query(
        'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
        [newProjectId, req.user.id, 'admin']
      );
      return newProjectId;
    });

    const project = await queryOne('SELECT * FROM projects WHERE id = ?', [projectId]);
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id
router.get('/:id', requireProjectMember, async (req, res, next) => {
  try {
    const project = await queryOne(`
      SELECT p.*, u.name as creator_name
      FROM projects p
      JOIN users u ON u.id = p.created_by
      WHERE p.id = ?
    `, [req.params.id]);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const members = await queryAll(`
      SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ?
      ORDER BY pm.role DESC, pm.joined_at ASC
    `, [req.params.id]);

    res.json({ project: { ...project, members }, userRole: req.projectRole });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id
router.put('/:id', requireProjectAdmin, projectValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description } = req.body;

  try {
    await runSql('UPDATE projects SET name = ?, description = ? WHERE id = ?',
      [name, description || '', req.params.id]);

    const project = await queryOne('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id
router.delete('/:id', requireProjectAdmin, async (req, res, next) => {
  try {
    await runSql('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/members
router.post('/:id/members', requireProjectAdmin, memberValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, role } = req.body;

  try {
    const user = await queryOne('SELECT id, name, email, avatar_color FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(404).json({ error: 'User not found. They must sign up first.' });
    }

    const existing = await queryOne(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
      [req.params.id, user.id]
    );
    if (existing) {
      return res.status(409).json({ error: 'User is already a member of this project' });
    }

    await runSql(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [req.params.id, user.id, role || 'member']
    );

    const member = await queryOne(`
      SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ? AND pm.user_id = ?
    `, [req.params.id, user.id]);

    res.status(201).json({ member });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', requireProjectAdmin, async (req, res, next) => {
  const { id, userId } = req.params;

  try {
    if (parseInt(userId) === req.user.id) {
      const adminCount = await queryOne(
        "SELECT COUNT(*) as count FROM project_members WHERE project_id = ? AND role = 'admin'",
        [id]
      );
      if (parseInt(adminCount.count, 10) <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin.' });
      }
    }

    await runSql('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [id, userId]);
    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
