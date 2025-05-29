// src/services/apiService.ts
import axios, { InternalAxiosRequestConfig, AxiosError, AxiosHeaders } from 'axios'; // Thêm AxiosHeaders
import Swal from 'sweetalert2';

const API_BASE_URL = 'http://localhost:8080/api';

const apiService = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiService.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            // Cách 1: Kiểm tra và khởi tạo nếu cần, sau đó gán
            if (!config.headers) {
                // Nếu config.headers là undefined, Axios sẽ tự tạo nó
                // khi bạn gán thuộc tính đầu tiên.
                // Để TypeScript yên tâm, chúng ta có thể khởi tạo nó như một đối tượng rỗng
                // hoặc cụ thể hơn là một instance của AxiosHeaders.
                // Cách đơn giản và thường hoạt động:
                config.headers = new AxiosHeaders(); // Hoặc config.headers = {} as AxiosRequestHeaders; (ít an toàn hơn)
            }
            // Bây giờ config.headers chắc chắn đã được định nghĩa
            config.headers.set('Authorization', `Bearer ${token}`); // Sử dụng phương thức .set()

            // Hoặc bạn có thể làm như cũ nếu đã khởi tạo đúng cách:
            // config.headers['Authorization'] = `Bearer ${token}`;
            // console.log('Interceptor: Authorization header added');
        } else {
            // console.log('Interceptor: No accessToken found in localStorage');
        }
        return config;
    },
    (error: AxiosError) => {
        console.error('Request Interceptor Error:', error);
        return Promise.reject(error);
    }
);

// ... (phần còn lại của file giữ nguyên)
apiService.interceptors.response.use(
    (response) => {
        return response;
    },
    (error: AxiosError) => {
        console.error('Response Interceptor Error:', error.config?.url, error.response?.status, error.response?.data);
        if (error.response) {
            const { status } = error.response;
            if (status === 401 || status === 403) {
                console.warn('Interceptor: Unauthorized (401) or Forbidden (403) response. Token might be invalid or expired.');
                localStorage.removeItem('accessToken');
            }
        } else if (error.request) {
            console.error('Interceptor: No response received from server.', error.request);
        } else {
            console.error('Interceptor: Error setting up request.', error.message);
        }
        return Promise.reject(error);
    }
);

export default apiService;