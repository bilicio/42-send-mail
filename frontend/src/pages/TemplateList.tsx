import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { templatesApi, type EmailTemplate } from '../api'

export default function TemplateList() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    templatesApi
      .list()
      .then(setTemplates)
      .catch(() => setError('Failed to load templates'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return
    try {
      await templatesApi.remove(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch {
      alert('Failed to delete template')
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      const copy = await templatesApi.duplicate(id)
      setTemplates((prev) => [copy, ...prev])
    } catch {
      alert('Failed to duplicate template')
    }
  }

  if (loading) return <p style={styles.center}>Loading...</p>
  if (error) return <p style={{ ...styles.center, color: 'red' }}>{error}</p>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Email Templates</h1>
        <Link to="/templates/new" style={styles.btnPrimary}>
          + New Template
        </Link>
      </div>

      {templates.length === 0 ? (
        <p style={styles.empty}>No templates yet. Create your first one!</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Subject</th>
              <th style={styles.th}>Variables</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} style={styles.tr}>
                <td style={styles.td}>{t.name}</td>
                <td style={styles.td}>{t.subject}</td>
                <td style={styles.td}>{(t.variables ?? []).join(', ') || '—'}</td>
                <td style={{ ...styles.td, display: 'flex', gap: 8 }}>
                  <button style={styles.btnSecondary} onClick={() => navigate(`/templates/${t.id}/edit`)}>
                    Edit
                  </button>
                  <button style={styles.btnSecondary} onClick={() => navigate(`/templates/${t.id}/send`)}>
                    Send Test
                  </button>
                  <button style={styles.btnSecondary} onClick={() => handleDuplicate(t.id)}>
                    Duplicate
                  </button>
                  <button style={styles.btnDanger} onClick={() => handleDelete(t.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 900, margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { margin: 0, fontSize: 24 },
  btnPrimary: {
    background: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: 6,
    textDecoration: 'none', fontWeight: 600
  },
  btnSecondary: {
    background: '#e5e7eb', color: '#111', padding: '5px 12px', border: 'none',
    borderRadius: 4, cursor: 'pointer', fontSize: 13
  },
  btnDanger: {
    background: '#fee2e2', color: '#dc2626', padding: '5px 12px', border: 'none',
    borderRadius: 4, cursor: 'pointer', fontSize: 13
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #e5e7eb' },
  td: { padding: '10px 12px', verticalAlign: 'middle' },
  center: { textAlign: 'center', marginTop: 80 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 60 }
}
