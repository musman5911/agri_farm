import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: BASE_URL,
});

// Automatically add token to headers if it exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// --- AUTH / USER ROUTES ---
export const signup = (username, email, password, role = "worker") => {
    return api.post('/signup', { username, email, password, role });
};
export const getMe = () => api.get('/users/me');

export const login = (email, password) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    return api.post('/login', params);
};

export const getUsers = () => api.get('/users');
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const changePassword = (currentPassword, newPassword) => {
    return api.post('/change-password', { currentPassword, newPassword });
};
export const updateMe = (email) => {
    return api.put('/users/me', { email });
};
export const changeWorkerPassword = (id, newPassword) => {
    return api.patch(`/users/${id}/password`, { newPassword });
};
export const checkSetup = () => api.get('/check-setup');
export const forgotPassword = (email) => api.post('/forgot-password', { email });
export const resetPassword = (email, code, newPassword) => {
    return api.post('/reset-password', { email, code, newPassword });
};

// --- CROPS ROUTES ---
export const getCrops = () => api.get('/crops');
export const addCrop = (crop) => api.post('/crops', crop);
export const updateCrop = (id, crop) => api.put(`/crops/${id}`, crop);
export const updateCropStatus = (id, status) => api.patch(`/crops/${id}`, { status });
export const deleteCrop = (id) => api.delete(`/crops/${id}`);

// --- FINANCE ROUTES ---
export const getFinance = () => api.get('/finance');
export const addFinance = (entry) => api.post('/finance', entry);
export const updateFinance = (id, entry) => api.put(`/finance/${id}`, entry);
export const deleteFinance = (id) => api.delete(`/finance/${id}`);

// --- TASKS ROUTES ---
export const getTasks = () => api.get('/tasks');
export const addTask = (task) => api.post('/tasks', task);
export const updateTask = (id, task) => api.put(`/tasks/${id}`, task);
export const completeTask = (id) => api.patch(`/tasks/${id}`);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);

// --- BACKUP & RESTORE ---
export const getBackup = () => api.get('/backup');
export const restoreBackup = (payload) => api.post('/restore', payload);

export default api;
