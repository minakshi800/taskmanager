const express = require('express');
const router = express.Router();
const { queryAll, queryOne } = require('../db/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/dashboard
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const projectRows = await queryAll(
      'SELECT project_id FROM project_members WHERE user_id = ?',
      [userId]
    );
    const projectIds = projectRows.map(r => r.project_id);

    if (projectIds.length === 0) {
      return res.json({
        stats: { total: 0, todo: 0, in_progress: 0, done: 0, overdue: 0 },
        recentTasks: [],
        projectStats: [],
        myTasks: [],
      });
    }

    // Postgres requires parameters as $1, $2, etc., but our queryAll helper converts ? to $1, $2
    const placeholders = projectIds.map(() => '?').join(',');

    const statsRaw = await queryOne(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN due_date < CURRENT_DATE AND status != 'done' THEN 1 ELSE 0 END) as overdue
      FROM tasks
      WHERE project_id IN (${placeholders})
    `, projectIds);

    // Postgres SUM returns strings (bigint), parse them
    const stats = {
      total: parseInt(statsRaw.total || 0, 10),
      todo: parseInt(statsRaw.todo || 0, 10),
      in_progress: parseInt(statsRaw.in_progress || 0, 10),
      done: parseInt(statsRaw.done || 0, 10),
      overdue: parseInt(statsRaw.overdue || 0, 10),
    };

    const recentTasks = await queryAll(`
      SELECT t.*, p.name as project_name,
        u1.name as assigned_to_name, u1.avatar_color as assigned_to_color
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u1 ON u1.id = t.assigned_to
      WHERE t.project_id IN (${placeholders})
      ORDER BY t.updated_at DESC
      LIMIT 10
    `, projectIds);

    const projectStatsRaw = await queryAll(`
      SELECT p.id, p.name,
        COUNT(t.id) as task_count,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.id IN (${placeholders})
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, projectIds);

    // Parse counts
    const projectStats = projectStatsRaw.map(p => ({
      ...p,
      task_count: parseInt(p.task_count || 0, 10),
      done_count: parseInt(p.done_count || 0, 10),
      member_count: parseInt(p.member_count || 0, 10),
    }));

    const myTasks = await queryAll(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.assigned_to = ? AND t.status != 'done'
      ORDER BY 
        CASE WHEN t.due_date < CURRENT_DATE THEN 0 ELSE 1 END,
        t.due_date ASC
      LIMIT 10
    `, [userId]);

    res.json({ stats, recentTasks, projectStats, myTasks });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
