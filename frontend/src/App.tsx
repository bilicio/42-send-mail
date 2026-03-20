import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TemplateList from './pages/TemplateList'
import TemplateEditor from './pages/TemplateEditor'
import SendTest from './pages/SendTest'
import EmailLogs from './pages/EmailLogs'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TemplateList />} />
        <Route path="/logs" element={<EmailLogs />} />
        <Route path="/templates/new" element={<TemplateEditor />} />
        <Route path="/templates/:id/edit" element={<TemplateEditor />} />
        <Route path="/templates/:id/send" element={<SendTest />} />
      </Routes>
    </BrowserRouter>
  )
}
