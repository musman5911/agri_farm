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

export const signup = (username, email, password) => {
    return api.post('/signup', { username, email, password });
};

export const login = (email, password) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    return api.post('/login', params);
};

export const getCrops = () => api.get('/crops');
export const addCrop = (crop) => api.post('/crops', crop);
export const updateCropStatus = (id, status) => api.patch(`/crops/${id}`, { status });
export const deleteCrop = (id) => api.delete(`/crops/${id}`);

export const getFinance = () => api.get('/finance');
export const addFinance = (entry) => api.post('/finance', entry);
export const deleteFinance = (id) => api.delete(`/finance/${id}`);

export const getTasks = () => api.get('/tasks');
export const addTask = (task) => api.post('/tasks', task);
export const completeTask = (id) => api.patch(`/tasks/${id}`);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);

export default api;
