import axios from 'axios';

const URL = "http://localhost:8000";

export const login = (email, password) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    return axios.post(`${URL}/login`, params);
};

export const getCrops = () => {
    const token = localStorage.getItem('token');
    return axios.get(`${URL}/crops`, {
        headers: { Authorization: `Bearer ${token}` }
    });
};