import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import './ProjectDetail.css';

const STATUS_COLS = [
  { key: 'todo', label: 'To Do', icon: '📋', color: '#94a3b8' },
  { key: 'in_progress', label: 'In Progress', icon: '🔄', color: '#f59e0b' },
  { key: 'done', label: 'Done', icon: '✅', color: '#10b981' },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [userRole, setUserRole] = useState('member');
  const [loading, setLoading] = useState(true);

  // Task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', status: 'todo', assigned_to: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  // Member modal
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [addingMember, setAddingMember] = useState(false);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'task'|'project', id }

  const isAdmin = userRole === 'admin';

  const loadProject = async () => {
    try {
      const [projData, taskData] = await Promise.all([api.getProject(id), api.getTasks(id)]);
      setProject(projData.project);
      setUserRole(projData.userRole);
      setTasks(taskData.tasks);
    } catch (err) {
      toast.error('Failed to load project details');
      if (err.status === 403 || err.status === 404) navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProject(); }, [id]);

  const openCreateTask = () => {
    setEditTask(null);
    setTaskForm({ title: '', description: '', priority: 'medium', status: 'todo', assigned_to: '', due_date: '' });
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setEditTask(task);
    setTaskForm({
      title: task.title, description: task.description || '',
      priority: task.priority, status: task.status,
      assigned_to: task.assigned_to || '', due_date: task.due_date ? task.due_date.split('T')[0] : '',
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    setSaving(true);
    try {
      const body = { ...taskForm, assigned_to: taskForm.assigned_to || null, due_date: taskForm.due_date || null };
      if (editTask) {
        await api.updateTask(editTask.id, body);
        toast.success('Task updated');
      } else {
        await api.createTask(id, body);
        toast.success('Task created');
      }
      setShowTaskModal(false);
      loadProject();
    } catch (err) {
      toast.error(err.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const sourceStatus = result.source.droppableId;
    const destStatus = result.destination.droppableId;
    
    if (sourceStatus === destStatus) return;

    const taskId = parseInt(result.draggableId, 10);
    const task = tasks.find(t => t.id === taskId);
    
    if (!isAdmin && task.assigned_to !== user.id) {
      toast.error('You can only move tasks assigned to you');
      return;
    }

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: destStatus } : t));

    try {
      await api.updateTaskStatus(taskId, destStatus);
      toast.success('Task moved');
    } catch (err) {
      toast.error(err.message || 'Failed to move task');
      // Revert on error
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: sourceStatus } : t));
    }
  };

  const handleAddMember = async () => {
    setAddingMember(true);
    try {
      await api.addMember(id, { email: memberEmail, role: memberRole });
      toast.success('Member added successfully');
      setShowMemberModal(false);
      setMemberEmail('');
      loadProject();
    } catch (err) {
      toast.error(err.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await api.removeMember(id, userId);
      toast.success('Member removed');
      loadProject();
    } catch (err) {
      toast.error(err.message || 'Failed to remove member');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'task') {
        await api.deleteTask(deleteTarget.id);
        toast.success('Task deleted');
      } else {
        await api.deleteProject(id);
        toast.success('Project deleted');
        navigate('/projects');
        return;
      }
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      loadProject();
    } catch (err) { 
      toast.error(err.message || 'Failed to delete');
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const isOverdue = (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done';

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="pd-header animate-fade-in">
          <div className="pd-header-left">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ marginBottom: 8 }}>← Back to Projects</button>
            {loading ? (
               <>
                 <Skeleton type="title" style={{ width: '200px' }} />
                 <Skeleton type="text" style={{ width: '300px' }} />
               </>
            ) : (
               <>
                 <h1 className="page-title">{project?.name}</h1>
                 {project?.description && <p className="page-subtitle">{project.description}</p>}
               </>
            )}
          </div>
          <div className="pd-header-actions">
            {!loading && isAdmin && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowMemberModal(true)} id="btn-add-member">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                  Add Member
                </button>
                <button className="btn btn-primary btn-sm" onClick={openCreateTask} id="btn-add-task">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Task
                </button>
              </>
            )}
          </div>
        </div>

        {/* Members bar */}
        <div className="pd-members animate-fade-in">
          <span className="pd-members-label">Team ({loading ? '-' : project?.members?.length})</span>
          <div className="pd-members-list">
            {loading ? (
               <div style={{ display: 'flex', gap: '8px' }}>
                 <Skeleton type="avatar" count={3} />
               </div>
            ) : project?.members?.map(m => (
              <div key={m.id} className="pd-member" title={`${m.name} (${m.role})`}>
                <div className="avatar avatar-sm" style={{ background: m.avatar_color }}>{m.name.charAt(0)}</div>
                <span className="pd-member-name">{m.name}</span>
                <span className={`badge badge-${m.role}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{m.role}</span>
                {isAdmin && m.id !== user.id && (
                  <button className="btn btn-ghost btn-icon" style={{ width: 22, height: 22 }} onClick={() => handleRemoveMember(m.id)} title="Remove member">×</button>
                )}
              </div>
            ))}
          </div>
          {!loading && isAdmin && (
            <button className="btn btn-danger btn-sm" onClick={() => { setDeleteTarget({ type: 'project', id }); setShowDeleteConfirm(true); }} style={{ marginLeft: 'auto' }}>
              Delete Project
            </button>
          )}
        </div>

        {/* Kanban Board */}
        <div className="kanban-board">
          {loading ? (
             Array(3).fill(0).map((_, i) => (
                <div key={i} className="kanban-col animate-fade-in-up">
                  <div className="kanban-col-header"><Skeleton type="text" style={{ width: '80px', margin: 0 }} /></div>
                  <Skeleton type="card" count={2} style={{ marginBottom: '12px', borderRadius: '12px' }} />
                </div>
             ))
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              {STATUS_COLS.map(col => {
                const colTasks = tasks.filter(t => t.status === col.key);
                return (
                  <div key={col.key} className="kanban-col animate-fade-in-up">
                    <div className="kanban-col-header">
                      <span className="kanban-col-dot" style={{ background: col.color }} />
                      <span className="kanban-col-title">{col.label}</span>
                      <span className="kanban-col-count">{colTasks.length}</span>
                    </div>
                    
                    <Droppable droppableId={col.key}>
                      {(provided, snapshot) => (
                        <div 
                          className={`kanban-col-body ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{ minHeight: '150px' }}
                        >
                          {colTasks.length === 0 && !snapshot.isDraggingOver ? (
                            <div className="kanban-empty">Drop tasks here</div>
                          ) : (
                            colTasks.map((task, index) => (
                              <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                                {(provided, snapshot) => (
                                  <div 
                                    className={`kanban-card glass-card ${isOverdue(task) ? 'kanban-card-overdue' : ''}`}
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      ...provided.draggableProps.style,
                                      boxShadow: snapshot.isDragging ? 'var(--shadow-lg)' : '',
                                      cursor: 'grab'
                                    }}
                                  >
                                    <div className="kanban-card-top">
                                      <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                                      {isAdmin && (
                                        <div className="kanban-card-actions">
                                          <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 24, fontSize: '0.75rem' }} onClick={() => openEditTask(task)} title="Edit">✏️</button>
                                          <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 24, fontSize: '0.75rem' }} onClick={() => { setDeleteTarget({ type: 'task', id: task.id }); setShowDeleteConfirm(true); }} title="Delete">🗑️</button>
                                        </div>
                                      )}
                                    </div>
                                    <h4 className="kanban-card-title">{task.title}</h4>
                                    {task.description && <p className="kanban-card-desc">{task.description}</p>}
                                    <div className="kanban-card-footer">
                                      <div className="kanban-card-meta">
                                        {task.due_date && <span className={`task-date ${isOverdue(task) ? 'overdue' : ''}`}>📅 {formatDate(task.due_date)}</span>}
                                      </div>
                                      {task.assigned_to_name && (
                                        <div className="avatar avatar-sm" style={{ background: task.assigned_to_color }} title={task.assigned_to_name}>{task.assigned_to_name.charAt(0)}</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </DragDropContext>
          )}
        </div>

        {/* Task Modal */}
        <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title={editTask ? 'Edit Task' : 'Create Task'} footer={
          <><button className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveTask} disabled={saving || !taskForm.title.trim()} id="btn-save-task">{saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : editTask ? 'Update' : 'Create'}</button></>
        }>
          <div className="input-group"><label>Title</label><input className="input-field" placeholder="Task title" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div className="input-group"><label>Description</label><textarea className="input-field" placeholder="Optional description" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group"><label>Priority</label><select className="input-field" value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
            <div className="input-group"><label>Status</label><select className="input-field" value={taskForm.status} onChange={e => setTaskForm(f => ({ ...f, status: e.target.value }))}><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option></select></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group"><label>Assign To</label><select className="input-field" value={taskForm.assigned_to} onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))}><option value="">Unassigned</option>{project?.members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            <div className="input-group"><label>Due Date</label><input type="date" className="input-field" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} /></div>
          </div>
        </Modal>

        {/* Member Modal */}
        <Modal isOpen={showMemberModal} onClose={() => setShowMemberModal(false)} title="Add Team Member" footer={
          <><button className="btn btn-secondary" onClick={() => setShowMemberModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddMember} disabled={addingMember || !memberEmail.trim()} id="btn-confirm-add-member">{addingMember ? <div className="spinner" style={{ width: 16, height: 16 }} /> : 'Add Member'}</button></>
        }>
          <div className="input-group"><label>Email Address</label><input type="email" className="input-field" placeholder="member@example.com" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} /></div>
          <div className="input-group"><label>Role</label><select className="input-field" value={memberRole} onChange={e => setMemberRole(e.target.value)}><option value="member">Member</option><option value="admin">Admin</option></select></div>
        </Modal>

        {/* Delete Confirm */}
        <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Confirm Delete" footer={
          <><button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button></>
        }>
          <p style={{ color: 'var(--text-secondary)' }}>Are you sure you want to delete this {deleteTarget?.type}? This action cannot be undone.</p>
        </Modal>
      </main>
    </div>
  );
}
