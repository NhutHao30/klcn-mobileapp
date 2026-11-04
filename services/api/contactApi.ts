import apiClient from '@/services/apiClient';

export interface ContactPayload {
  name: string;
  email?: string;
  phone?: string;
  message: string;
}

export const contactApi = {
  async sendContactMessage(payload: ContactPayload) {
    const response = await apiClient.post('/contact', payload);
    return response.data;
  },
};
