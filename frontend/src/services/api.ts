import axios, { AxiosError } from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("reachinbox_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: any[] }>) => {
    if (error.response?.status === 401) {
      // Clear token if expired or invalid
      if (
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/auth/callback")
      ) {
        localStorage.removeItem("reachinbox_token");
        window.location.href = "/login?expired=true";
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.message) return data.message;
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.map((e: any) => e.message || e.field).join(", ");
    }
    return error.message || "An unexpected network error occurred";
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}
