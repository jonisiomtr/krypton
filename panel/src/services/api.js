import axios from 'axios'

const api = axios.create({

  baseURL:
    import.meta.env.VITE_API_URL ||
    window.location.origin

})

// Interceptor para adicionar o token JWT nos headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default api