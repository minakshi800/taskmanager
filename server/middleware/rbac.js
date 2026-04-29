const { queryOne } = require('../db/database');

/**
 * Middleware: Require user to be a member of the project (any role)
 */
async function requireProjectMember(req, res, next) {
  const projectId = req.params.id || req.params.projectId;
  const userId = req.user.id;

  try {
    const member = await queryOne(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    req.projectRole = member.role;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware: Require user to be an admin of the project
 */
async function requireProjectAdmin(req, res, next) {
  const projectId = req.params.id || req.params.projectId;
  const userId = req.user.id;

  try {
    const member = await queryOne(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    if (member.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.projectRole = member.role;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireProjectMember, requireProjectAdmin };
