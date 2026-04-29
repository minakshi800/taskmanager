import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import './Projects.css';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    api.getProjects().then(d => setProjects(d.projects)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await api.createProject({ name, description });
      setShowModal(false);
      setName('');
      setDescription('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="projects-header animate-fade-in">
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-subtitle">Manage your team projects</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="btn-new-project">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Project
          </button>
        </div>

        {loading ? (
          <div className="loading-screen" style={{ minHeight: 'auto', padding: '100px 0' }}><div className="spinner" /></div>
        ) : projects.length === 0 ? (
          <div className="empty-state glass-card animate-fade-in-up" style={{ padding: '80px 24px' }}>
            <div className="empty-state-icon">📁</div>
            <h3>No projects yet</h3>
            <p>Create your first project to start managing tasks</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: 16 }}>Create Project</button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((p, i) => {
              const progress = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className={`project-card glass-card animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}>
                  <div className="project-card-header">
                    <div className="project-card-icon" style={{ background: `linear-gradient(135deg, #7c3aed, #06b6d4)` }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className={`badge badge-${p.user_role}`}>{p.user_role}</span>
                  </div>
                  <h3 className="project-card-name">{p.name}</h3>
                  <p className="project-card-desc">{p.description || 'No description'}</p>
                  <div className="project-card-stats">
                    <span>{p.task_count} tasks</span>
                    <span>·</span>
                    <span>{p.member_count} members</span>
                  </div>
                  <div className="project-card-progress">
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="progress-label">{progress}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Project" footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !name.trim()} id="btn-create-project">
              {creating ? <div className="spinner" style={{ width: 16, height: 16 }} /> : 'Create Project'}
            </button>
          </>
        }>
          {error && <div className="error-message">{error}</div>}
          <div className="input-group">
            <label htmlFor="project-name">Project Name</label>
            <input id="project-name" className="input-field" placeholder="e.g. Website Redesign" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="input-group">
            <label htmlFor="project-desc">Description</label>
            <textarea id="project-desc" className="input-field" placeholder="What is this project about?" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
        </Modal>
      </main>
    </div>
  );
}
