import axios from 'axios';

export const api = axios.create({
    baseURL: 'http://127.0.0.1:5000',
    withCredentials: true,
});


export const radarApi = axios.create({
    baseURL: 'http://192.168.64.196:5001',
    withCredentials: true,
})