// Shared API config for all frontend services
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;
