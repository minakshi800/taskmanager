const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const { queryAll, queryOne, runSql } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { requireProjectMember, requireProjectAdmin } = require('../middleware/rbac');
const { taskValidation, statusValidation } = require('../utils/validators');

router.use(authenticate);

// GET /api/projects/:id/tasks
router.get('/projects/:id/tasks', requireProjectMember, async (req, res, next) => {
  const { status, priority, assigned_to } = req.query;

  let query = `
    SELECT t.*, 
      u1.name as assigned_to_name, u1.avatar_color as assigned_to_color,
      u2.name as created_by_name
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.assigned_to
    JOIN users u2 ON u2.id = t.created_by
    WHERE t.project_id = ?
  `;
  const params = [req.params.id];

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }
  if (priority) {
    query += ' AND t.priority = ?';
    params.push(priority);
  }
  if (assigned_to) {
    query += ' AND t.assigned_to = ?';
    params.push(assigned_to);
  }

  query += ' ORDER BY t.created_at DESC';

  try {
    const tasks = await queryAll(query, params);
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/tasks
router.post('/projects/:id/tasks', requireProjectAdmin, taskValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, priority, status, assigned_to, due_date } = req.body;
  const projectId = req.params.id;

  try {
    if (assigned_to) {
      const member = await queryOne(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, assigned_to]
      );
      if (!member) {
        return res.status(400).json({ error: 'Assigned user is not a member of this project' });
      }
    }

    const result = await runSql(`
      INSERT INTO tasks (project_id, title, description, priority, status, assigned_to, created_by, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      projectId,
      title,
      description || '',
      priority || 'medium',
      status || 'todo',
      assigned_to || null,
      req.user.id,
      due_date || null
    ], true);

    const task = await queryOne(`
      SELECT t.*, 
        u1.name as assigned_to_name, u1.avatar_color as assigned_to_color,
        u2.name as created_by_name
      FROM tasks t
      LEFT JOIN users u1 ON u1.id = t.assigned_to
      JOIN users u2 ON u2.id = t.created_by
      WHERE t.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id
router.get('/tasks/:id', async (req, res, next) => {
  try {
    const task = await queryOne(`
      SELECT t.*, 
        u1.name as assigned_to_name, u1.avatar_color as assigned_to_color,
        u2.name as created_by_name,
        p.name as project_name
      FROM tasks t
      LEFT JOIN users u1 ON u1.id = t.assigned_to
      JOIN users u2 ON u2.id = t.created_by
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = ?
    `, [req.params.id]);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const member = await queryOne(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [task.project_id, req.user.id]
    );

    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    res.json({ task, userRole: member.role });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id
router.put('/tasks/:id', taskValidation, async (req, res, next) => {
  try {
    const task = await queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const member = await queryOne(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [task.project_id, req.user.id]
    );

    if (!member || member.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required to edit tasks' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, priority, status, assigned_to, due_date } = req.body;

    if (assigned_to) {
      const assignee = await queryOne(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
        [task.project_id, assigned_to]
      );
      if (!assignee) {
        return res.status(400).json({ error: 'Assigned user is not a member of this project' });
      }
    }

    await runSql(`
      UPDATE tasks 
      SET title = ?, description = ?, priority = ?, status = ?, assigned_to = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title || task.title,
      description !== undefined ? description : task.description,
      priority || task.priority,
      status || task.status,
      assigned_to !== undefined ? assigned_to : task.assigned_to,
      due_date !== undefined ? due_date : task.due_date,
      req.params.id
    ]);

    const updated = await queryOne(`
      SELECT t.*, 
        u1.name as assigned_to_name, u1.avatar_color as assigned_to_color,
        u2.name as created_by_name
      FROM tasks t
      LEFT JOIN users u1 ON u1.id = t.assigned_to
      JOIN users u2 ON u2.id = t.created_by
      WHERE t.id = ?
    `, [req.params.id]);

    res.json({ task: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id/status
router.patch('/tasks/:id/status', statusValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const task = await queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const member = await queryOne(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [task.project_id, req.user.id]
    );

    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    if (member.role !== 'admin' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'You can only update status of tasks assigned to you' });
    }

    const { status } = req.body;

    await runSql('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, req.params.id]);

    const updated = await queryOne(`
      SELECT t.*, 
        u1.name as assigned_to_name, u1.avatar_color as assigned_to_color,
        u2.name as created_by_name
      FROM tasks t
      LEFT JOIN users u1 ON u1.id = t.assigned_to
      JOIN users u2 ON u2.id = t.created_by
      WHERE t.id = ?
    `, [req.params.id]);

    res.json({ task: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id
router.delete('/tasks/:id', async (req, res, next) => {
  try {
    const task = await queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const member = await queryOne(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [task.project_id, req.user.id]
    );

    if (!member || member.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required to delete tasks' });
    }

    await runSql('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
