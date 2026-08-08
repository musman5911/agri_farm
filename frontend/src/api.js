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

// Offline request queueing response interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // If offline or network request fails on a write method, save to local queue
        if ((!navigator.onLine || !error.response) && originalRequest && ['post', 'put', 'patch', 'delete'].includes(originalRequest.method.toLowerCase())) {
            const queue = JSON.parse(localStorage.getItem('offline_request_queue') || '[]');
            
            // Prevent duplicate queueing of identical requests
            const alreadyQueued = queue.some(item => item.url === originalRequest.url && JSON.stringify(item.data) === JSON.stringify(originalRequest.data));
            if (!alreadyQueued) {
                const newRequest = {
                    id: Date.now().toString(),
                    url: originalRequest.url,
                    method: originalRequest.method.toLowerCase(),
                    data: typeof originalRequest.data === 'string' ? JSON.parse(originalRequest.data) : originalRequest.data
                };
                queue.push(newRequest);
                localStorage.setItem('offline_request_queue', JSON.stringify(queue));
                window.dispatchEvent(new CustomEvent('offline-request-queued', { detail: queue.length }));
            }
            
            // Return resolved promise pretending it was successful so the UI updates and stays responsive
            return Promise.resolve({ data: { status: "ok", offline: true } });
        }
        return Promise.reject(error);
    }
);

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
export const requestProfileCode = () => api.post('/request-profile-code');
export const changePassword = (currentPassword, newPassword, code = "") => {
    return api.post('/change-password', { currentPassword, newPassword, code });
};
export const updateMe = (email, code = "") => {
    return api.put('/users/me', { email, code });
};
export const editWorkerProfile = (id, newUsername, newPassword, adminPassword) => {
    return api.patch(`/users/${id}/edit`, { newUsername, newPassword, adminPassword });
};

// --- AUTOMATION SETTINGS ---
export const getAutomations = () => api.get('/settings/automations');
export const saveAutomations = (settings) => api.put('/settings/automations', settings);
export const triggerImmediateDigest = (payload) => api.post('/settings/automations/trigger', payload);
export const getTodaySummary = () => api.get('/summary/today');
export const emailTodaySummary = () => api.post('/summary/today/email');
export const checkSetup = () => api.get('/check-setup');
export const forgotPassword = (email) => api.post('/forgot-password', { email });
export const resetPassword = (email, code, newPassword) => {
    return api.post('/reset-password', { email, code, newPassword });
};

// --- CROPS ROUTES ---
export const getCrops = (skip = 0, limit = 100) => api.get(`/crops?skip=${skip}&limit=${limit}`);
export const addCrop = (crop) => api.post('/crops', crop);
export const updateCrop = (id, crop) => api.put(`/crops/${id}`, crop);
export const updateCropStatus = (id, status) => api.patch(`/crops/${id}`, { status });
export const deleteCrop = (id) => api.delete(`/crops/${id}`);

// --- FINANCE ROUTES ---
export const getFinance = (skip = 0, limit = 100) => api.get(`/finance?skip=${skip}&limit=${limit}`);
export const addFinance = (entry) => api.post('/finance', entry);
export const updateFinance = (id, entry) => api.put(`/finance/${id}`, entry);
export const deleteFinance = (id) => api.delete(`/finance/${id}`);

// --- TASKS ROUTES ---
export const getTasks = (skip = 0, limit = 100) => api.get(`/tasks?skip=${skip}&limit=${limit}`);
export const addTask = (task) => api.post('/tasks', task);
export const updateTask = (id, task) => api.put(`/tasks/${id}`, task);
export const completeTask = (id) => api.patch(`/tasks/${id}`);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);

// --- BACKUP & RESTORE ---
export const getBackup = () => api.get('/backup');
export const restoreBackup = (payload) => api.post('/restore', payload);

export default api;
