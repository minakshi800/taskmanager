const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || data.errors?.[0]?.msg || 'Something went wrong');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),

  // Projects
  getProjects: () => request('/projects'),
  createProject: (body) => request('/projects', { method: 'POST', body: JSON.stringify(body) }),
  getProject: (id) => request(`/projects/${id}`),
  updateProject: (id, body) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  addMember: (id, body) => request(`/projects/${id}/members`, { method: 'POST', body: JSON.stringify(body) }),
  removeMember: (id, userId) => request(`/projects/${id}/members/${userId}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (projectId) => request(`/projects/${projectId}/tasks`),
  createTask: (projectId, body) => request(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  getTask: (id) => request(`/tasks/${id}`),
  updateTask: (id, body) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateTaskStatus: (id, status) => request(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboard: () => request('/dashboard'),
};
