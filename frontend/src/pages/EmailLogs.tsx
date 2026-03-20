import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { emailLogsApi, type EmailLog } from '../api'

export default function EmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    emailLogsApi
      .list()
      .then(setLogs)
      .catch(() => setError('Failed to load logs'))
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  if (loading) return <p style={styles.center}>Loading...</p>
  if (error) return <p style={{ ...styles.center, color: 'red' }}>{error}</p>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Email Logs</h1>
        <Link to="/" style={styles.btnBack}>← Back</Link>
      </div>

      {logs.length === 0 ? (
        <p style={styles.empty}>No logs yet.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>To</th>
              <th style={styles.th}>Template</th>
              <th style={styles.th}>Subject</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Error</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={styles.tr}>
                <td style={styles.td}>{formatDate(log.created)}</td>
                <td style={styles.td}>{log.to}</td>
                <td style={styles.td}>{log.template_name || log.template_id || '—'}</td>
                <td style={styles.td}>{log.subject || '—'}</td>
                <td style={styles.td}>
                  <span style={log.status === 'success' ? styles.badgeSuccess : styles.badgeError}>
                    {log.status}
                  </span>
                </td>
                <td style={{ ...styles.td, color: '#dc2626', fontSize: 12 }}>
                  {log.error_message || '—'}
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
  container: { maxWidth: 1100, margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { margin: 0, fontSize: 24 },
  btnBack: { color: '#374151', textDecoration: 'none', fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f3f4f6', borderBottom: '2px solid #e5e7eb', fontSize: 13 },
  tr: { borderBottom: '1px solid #e5e7eb' },
  td: { padding: '10px 12px', verticalAlign: 'middle', fontSize: 13 },
  badgeSuccess: {
    background: '#dcfce7', color: '#16a34a', padding: '2px 8px',
    borderRadius: 4, fontSize: 12, fontWeight: 600,
  },
  badgeError: {
    background: '#fee2e2', color: '#dc2626', padding: '2px 8px',
    borderRadius: 4, fontSize: 12, fontWeight: 600,
  },
  center: { textAlign: 'center', marginTop: 80 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 60 },
}
