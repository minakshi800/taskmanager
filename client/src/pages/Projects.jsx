import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { api } from '../api/client';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import './Projects.css';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const loadProjects = async () => {
    try {
      const res = await api.getProjects();
      setProjects(res.projects);
    } catch (err) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.createProject(form);
      setShowModal(false);
      setForm({ name: '', description: '' });
      toast.success('Project created successfully!');
      loadProjects();
    } catch (err) {
      toast.error(err.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="projects-header animate-fade-in">
          <h1 className="page-title" style={{ marginBottom: 0 }}>Projects</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="btn-create-project">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Project
          </button>
        </div>

        <div className="projects-grid">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
               <div key={i} className="glass-card" style={{ padding: '24px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                   <Skeleton type="avatar" style={{ width: '42px', height: '42px', borderRadius: '12px' }} />
                 </div>
                 <Skeleton type="title" />
                 <Skeleton type="text" count={2} />
                 <Skeleton type="text" style={{ marginTop: '24px', height: '4px' }} />
               </div>
            ))
          ) : projects.length === 0 ? (
            <div className="glass-card empty-state animate-fade-in-up" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">🚀</div>
              <h3>No projects yet</h3>
              <p>Create your first project to get started.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>Create Project</button>
            </div>
          ) : (
            projects.map((p, i) => {
              const progress = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
              return (
                <div key={p.id} className={`project-card glass-card animate-fade-in-up stagger-${(i%5)+1}`} onClick={() => navigate(`/projects/${p.id}`)}>
                  <div className="project-card-header">
                    <div className="project-card-icon" style={{ background: 'var(--gradient-primary)' }}>
                      {p.name.substring(0, 2).toUpperCase()}
                    </div>
                    {p.user_role === 'admin' && <span className="badge badge-admin">Admin</span>}
                  </div>
                  <h3 className="project-card-name">{p.name}</h3>
                  <p className="project-card-desc">{p.description || 'No description provided.'}</p>
                  
                  <div className="project-card-progress">
                    <div style={{ flex: 1 }}>
                      <div className="project-card-stats" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>Progress</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="project-card-stats" style={{ marginTop: 8 }}>
                    <span>👥 {p.member_count} members</span>
                    <span>•</span>
                    <span>📝 {p.task_count} tasks</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Project" footer={
          <><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving || !form.name.trim()} id="btn-submit-project">{saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : 'Create'}</button></>
        }>
          <div className="input-group">
            <label>Project Name</label>
            <input className="input-field" placeholder="e.g. Website Redesign" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="input-group">
            <label>Description</label>
            <textarea className="input-field" placeholder="What is this project about?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
        </Modal>
      </main>
    </div>
  );
}
