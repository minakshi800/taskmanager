import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="loading-screen" style={{ minHeight: 'auto', padding: '100px 0' }}>
            <div className="spinner" />
          </div>
        </main>
      </div>
    );
  }

  const { stats, recentTasks, projectStats, myTasks } = data || {
    stats: { total: 0, todo: 0, in_progress: 0, done: 0, overdue: 0 },
    recentTasks: [], projectStats: [], myTasks: [],
  };

  const statCards = [
    { label: 'Total Tasks', value: stats.total, icon: '📋', color: '#7c3aed' },
    { label: 'In Progress', value: stats.in_progress, icon: '🔄', color: '#f59e0b' },
    { label: 'Completed', value: stats.done, icon: '✅', color: '#10b981' },
    { label: 'Overdue', value: stats.overdue, icon: '⚠️', color: '#ef4444' },
  ];

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (task) => {
    return task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  };

  const statusLabel = (s) => s === 'in_progress' ? 'In Progress' : s === 'todo' ? 'To Do' : 'Done';

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="dashboard-header animate-fade-in">
          <div>
            <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="page-subtitle">Here's what's happening across your projects</p>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {statCards.map((s, i) => (
            <div key={s.label} className={`stat-card glass-card animate-fade-in-up stagger-${i + 1}`}>
              <div className="stat-icon" style={{ background: `${s.color}20`, color: s.color }}>
                {s.icon}
              </div>
              <div className="stat-info">
                <span className="stat-value">{s.value || 0}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-grid">
          {/* My Tasks */}
          <div className="dashboard-section glass-card animate-fade-in-up stagger-3">
            <div className="section-header">
              <h2>My Tasks</h2>
              <span className="badge badge-in_progress">{myTasks.length} pending</span>
            </div>
            {myTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎉</div>
                <h3>All caught up!</h3>
                <p>No pending tasks assigned to you</p>
              </div>
            ) : (
              <div className="task-list">
                {myTasks.map(task => (
                  <div key={task.id} className={`task-list-item ${isOverdue(task) ? 'overdue' : ''}`}>
                    <div className="task-list-status">
                      <span className={`status-dot status-${task.status}`} />
                    </div>
                    <div className="task-list-info">
                      <span className="task-list-title">{task.title}</span>
                      <span className="task-list-meta">{task.project_name}</span>
                    </div>
                    <div className="task-list-right">
                      {task.due_date && (
                        <span className={`task-date ${isOverdue(task) ? 'overdue' : ''}`}>
                          {formatDate(task.due_date)}
                        </span>
                      )}
                      <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Projects Overview */}
          <div className="dashboard-section glass-card animate-fade-in-up stagger-4">
            <div className="section-header">
              <h2>Projects</h2>
              <Link to="/projects" className="btn btn-ghost btn-sm">View all →</Link>
            </div>
            {projectStats.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📁</div>
                <h3>No projects yet</h3>
                <p>Create your first project to get started</p>
                <Link to="/projects" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                  Create Project
                </Link>
              </div>
            ) : (
              <div className="project-stats-list">
                {projectStats.map(p => {
                  const progress = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
                  return (
                    <Link key={p.id} to={`/projects/${p.id}`} className="project-stat-item">
                      <div className="project-stat-info">
                        <span className="project-stat-name">{p.name}</span>
                        <span className="project-stat-meta">
                          {p.task_count} tasks · {p.member_count} members
                        </span>
                      </div>
                      <div className="project-stat-progress">
                        <span className="progress-label">{progress}%</span>
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-section glass-card animate-fade-in-up stagger-5" style={{ marginTop: 24 }}>
          <div className="section-header">
            <h2>Recent Activity</h2>
          </div>
          {recentTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <h3>No recent activity</h3>
              <p>Tasks will appear here once created</p>
            </div>
          ) : (
            <div className="task-list">
              {recentTasks.slice(0, 8).map(task => (
                <div key={task.id} className="task-list-item">
                  <div className="task-list-status">
                    <span className={`status-dot status-${task.status}`} />
                  </div>
                  <div className="task-list-info">
                    <span className="task-list-title">{task.title}</span>
                    <span className="task-list-meta">{task.project_name}</span>
                  </div>
                  <div className="task-list-right">
                    <span className={`badge badge-${task.status}`}>{statusLabel(task.status)}</span>
                    {task.assigned_to_name && (
                      <div className="avatar avatar-sm" style={{ background: task.assigned_to_color }}>
                        {task.assigned_to_name.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
