import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { templatesApi, sendEmailApi, type EmailTemplate } from '../api'

export default function SendTest() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [to, setTo] = useState('')
  const [subjectOverride, setSubjectOverride] = useState('')
  const [varValues, setVarValues] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    templatesApi.get(id!).then((t) => {
      setTemplate(t)
      const initial: Record<string, string> = {}
      for (const v of t.variables ?? []) initial[v] = ''
      setVarValues(initial)
    })
  }, [id])

  const handleSend = async () => {
    if (!to) { setError('Recipient email is required'); return }
    setSending(true)
    setError('')
    try {
      await sendEmailApi.send({
        templateId: id!,
        to,
        subject: subjectOverride || undefined,
        variables: varValues
      })
      setSent(true)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  if (!template) return <p style={styles.center}>Loading...</p>

  return (
    <div style={styles.container}>
      <button style={styles.btnBack} onClick={() => navigate('/')}>← Back</button>
      <h2 style={styles.title}>Send Test — {template.name}</h2>

      {sent ? (
        <div style={styles.success}>
          <p>Email sent successfully!</p>
          <button style={styles.btnPrimary} onClick={() => navigate('/')}>Back to Templates</button>
        </div>
      ) : (
        <div style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Recipient *</label>
            <input
              style={styles.input}
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Subject (optional override)</label>
            <input
              style={styles.input}
              value={subjectOverride}
              onChange={(e) => setSubjectOverride(e.target.value)}
              placeholder={template.subject}
            />
          </div>

          {(template.variables ?? []).length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Template Variables</h3>
              {(template.variables ?? []).map((v) => (
                <div key={v} style={styles.field}>
                  <label style={styles.label}>
                    <code>{`{{${v}}}`}</code>
                  </label>
                  <input
                    style={styles.input}
                    value={varValues[v] ?? ''}
                    onChange={(e) => setVarValues((prev) => ({ ...prev, [v]: e.target.value }))}
                    placeholder={`Value for ${v}`}
                  />
                </div>
              ))}
            </div>
          )}

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.btnSend} onClick={handleSend} disabled={sending}>
            {sending ? 'Sending…' : 'Send Email'}
          </button>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 540, margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' },
  title: { marginBottom: 24 },
  btnBack: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
    color: '#374151', marginBottom: 12, padding: 0
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: {
    padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 5,
    fontSize: 14
  },
  section: { borderTop: '1px solid #e5e7eb', paddingTop: 16 },
  sectionTitle: { margin: '0 0 12px', fontSize: 15 },
  btnSend: {
    background: '#2563eb', color: '#fff', padding: '10px 0', border: 'none',
    borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 15, marginTop: 8
  },
  btnPrimary: {
    background: '#2563eb', color: '#fff', padding: '8px 20px', border: 'none',
    borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 14
  },
  error: { color: '#dc2626', fontSize: 13, margin: 0 },
  success: { textAlign: 'center', marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  center: { textAlign: 'center', marginTop: 80 }
}
