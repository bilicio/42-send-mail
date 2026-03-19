import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3030'
})

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  html_content: string
  design_json: object
  variables: string[]
  created_at: string
  updated_at: string
}

export interface EmailTemplateData {
  name: string
  subject: string
  html_content: string
  design_json: object
  variables: string[]
}

export interface SendEmailPayload {
  templateId: string
  to: string
  subject?: string
  variables: Record<string, string>
}

export interface TemplateImage {
  id: string
  name: string
  alt: string
  url: string
}

export const templatesApi = {
  list: () => api.get<{ data: EmailTemplate[] }>('/templates').then((r) => r.data.data ?? r.data),
  get: (id: string) => api.get<EmailTemplate>(`/templates/${id}`).then((r) => r.data),
  create: (data: EmailTemplateData) => api.post<EmailTemplate>('/templates', data).then((r) => r.data),
  update: (id: string, data: Partial<EmailTemplateData>) =>
    api.patch<EmailTemplate>(`/templates/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/templates/${id}`)
}

export const templateImagesApi = {
  upload: (file: File, name?: string, alt?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (name) formData.append('name', name)
    if (alt) formData.append('alt', alt)
    return api.post<TemplateImage>('/template-images', formData).then((r) => r.data)
  }
}

export const sendEmailApi = {
  send: (payload: SendEmailPayload) => api.post('/send-email', payload).then((r) => r.data)
}

export default api
