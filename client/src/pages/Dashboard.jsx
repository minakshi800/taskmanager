import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Sidebar from '../components/Sidebar';
import Skeleton from '../components/Skeleton';
import './Dashboard.css';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const res = await api.getDashboard();
        setData(res);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <h1 className="page-title animate-fade-in">Dashboard</h1>
        
        {/* Stats Grid */}
        <div className="stats-grid">
          {[
            { label: 'Total Tasks', key: 'total', color: 'var(--accent-purple)' },
            { label: 'To Do', key: 'todo', color: 'var(--status-todo)' },
            { label: 'In Progress', key: 'in_progress', color: 'var(--status-progress)' },
            { label: 'Done', key: 'done', color: 'var(--status-done)' },
            { label: 'Overdue', key: 'overdue', color: 'var(--status-overdue)' }
          ].map((stat, i) => (
            <div key={stat.label} className={`stat-card glass-card animate-fade-in-up stagger-${i+1}`}>
              <span className="stat-label">{stat.label}</span>
              {loading ? (
                 <Skeleton type="title" style={{ width: '60px', marginTop: '4px' }} />
              ) : (
                 <span className="stat-value" style={{ color: stat.color }}>
                   {data?.stats[stat.key] || 0}
                 </span>
              )}
            </div>
          ))}
        </div>

        <div className="dashboard-grid">
          {/* Recent Activity */}
          <div className="dashboard-section animate-fade-in-up stagger-4">
            <h2 className="section-title">Recent Activity</h2>
            <div className="recent-activity glass-card">
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <Skeleton type="text" count={5} style={{ height: '50px' }} />
                </div>
              ) : data?.recentTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📝</div>
                  <h3>No recent activity</h3>
                  <p>Create some tasks to see them here.</p>
                </div>
              ) : (
                data?.recentTasks.map(task => (
                  <div key={task.id} className="activity-item">
                    <div className="activity-icon" style={{ background: `var(--status-${task.status === 'in_progress' ? 'progress' : task.status})` }} />
                    <div className="activity-content">
                      <p className="activity-text">
                        <strong>{task.title}</strong> was updated in <span>{task.project_name}</span>
                      </p>
                      <span className="activity-time">{formatDate(task.updated_at)}</span>
                    </div>
                    <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* My Tasks */}
          <div className="dashboard-section animate-fade-in-up stagger-5">
            <h2 className="section-title">My Pending Tasks</h2>
            <div className="my-tasks glass-card">
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <Skeleton type="text" count={4} style={{ height: '60px' }} />
                </div>
              ) : data?.myTasks.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 16px' }}>
                  <div className="empty-state-icon">🎉</div>
                  <h3>All caught up!</h3>
                  <p>You have no pending tasks assigned to you.</p>
                </div>
              ) : (
                data?.myTasks.map(task => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                  return (
                    <div key={task.id} className="task-item">
                      <div className="task-item-main">
                        <h4 className="task-item-title">{task.title}</h4>
                        <span className="task-item-project">{task.project_name}</span>
                      </div>
                      <div className="task-item-meta">
                        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                        {task.due_date && (
                          <span className={`task-date ${isOverdue ? 'overdue' : ''}`}>
                            {formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
