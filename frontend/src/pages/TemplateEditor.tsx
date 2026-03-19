import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmailEditor } from 'react-email-editor'
import type { EditorRef } from 'react-email-editor'
import { templatesApi, templateImagesApi } from '../api'

export default function TemplateEditor() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const editorRef = useRef<EditorRef>(null)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [variables, setVariables] = useState<string[]>([])
  const [newVar, setNewVar] = useState('')
  const [saving, setSaving] = useState(false)
  const [editorReady, setEditorReady] = useState(false)
  const [loadedDesign, setLoadedDesign] = useState<object | null>(null)

  const isEdit = Boolean(id)

  useEffect(() => {
    if (!isEdit) return
    templatesApi.get(id!).then((template) => {
      setName(template.name)
      setSubject(template.subject)
      setVariables(template.variables ?? [])
      setLoadedDesign(template.design_json)
    })
  }, [id, isEdit])

  useEffect(() => {
    if (editorReady && loadedDesign) {
      editorRef.current?.editor?.loadDesign(loadedDesign as any)
    }
  }, [editorReady, loadedDesign])

  const detectVariables = (html: string): string[] => {
    const matches = html.matchAll(/\{\{(\w+)\}\}/g)
    const set = new Set<string>()
    for (const m of matches) set.add(m[1])
    return Array.from(set)
  }

  const handleSave = () => {
    if (!editorRef.current?.editor) {
      alert('Editor not ready')
      return
    }
    setSaving(true)
    editorRef.current.editor.exportHtml(async ({ html, design }: { html: string; design: object }) => {
      try {
        const detected = detectVariables(html)
        const merged = Array.from(new Set([...variables, ...detected]))

        const payload = {
          name,
          subject,
          html_content: html,
          design_json: design as object,
          variables: merged
        }

        if (isEdit) {
          await templatesApi.update(id!, payload)
        } else {
          await templatesApi.create(payload)
        }
        navigate('/')
      } catch {
        alert('Failed to save template')
        setSaving(false)
      }
    })
  }

  const addVariable = () => {
    const v = newVar.trim()
    if (v && !variables.includes(v)) {
      setVariables((prev) => [...prev, v])
    }
    setNewVar('')
  }

  const removeVariable = (v: string) => {
    setVariables((prev) => prev.filter((x) => x !== v))
  }

  return (
    <div style={styles.page}>
      <div style={styles.toolbar}>
        <button style={styles.btnBack} onClick={() => navigate('/')}>
          ← Back
        </button>
        <h2 style={styles.title}>{isEdit ? 'Edit Template' : 'New Template'}</h2>
        <button style={styles.btnSave} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Template'}
        </button>
      </div>

      <div style={styles.fields}>
        <label style={styles.label}>
          Name
          <input
            style={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name"
          />
        </label>
        <label style={styles.label}>
          Subject
          <input
            style={styles.input}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
          />
        </label>
      </div>

      <div style={styles.layout}>
        <div style={styles.editorWrap}>
          <EmailEditor
            ref={editorRef}
            options={{
              customJS: `
                (function() {
                  var BACKEND_URL = '${import.meta.env.VITE_API_URL || 'http://localhost:3030'}';
                  var origFetch = window.fetch.bind(window);
                  window.fetch = async function(url, opts) {
                    // Intercept Unlayer's call to api.unlayer.com/v2/images/upload-url.
                    // Return a fake presignedPost pointing to our backend.
                    // Unlayer will then POST a FormData with the file to that URL
                    // and read the final image URL from <Location> in the XML response.
                    if (typeof url === 'string' && url.includes('upload-url')) {
                      return new Response(JSON.stringify({
                        data: {
                          presignedPost: {
                            url: BACKEND_URL + '/upload-slot',
                            fields: {}
                          }
                        }
                      }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                      });
                    }
                    // Segunda camada de proteção (caso o Service Worker ainda não esteja ativo):
                    // stubs clonados do shape real das APIs Unlayer para que o editor
                    // inicialize corretamente sem acesso externo.
                    if (typeof url === 'string' && url.includes('api.unlayer.com/v2/editor/auth')) {
                      return new Response(JSON.stringify({
                        success: true,
                        data: {
                          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InByb2plY3RJZCI6MX0sImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzAwMDAwMDAwfQ.local-stub'
                        }
                      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
                    }
                    if (typeof url === 'string' && url.includes('api.unlayer.com/v2/editor/session')) {
                      return new Response(JSON.stringify({
                        success: true,
                        data: {
                          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InByb2plY3RJZCI6MSwiZW50aXRsZW1lbnRzIjp7ImV4cG9ydCI6dHJ1ZSwiY3VzdG9tSlMiOnRydWUsImN1c3RvbUNTUyI6dHJ1ZSwiZW1haWxCdWlsZGVyIjp0cnVlfX0sImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzAwMDAwMDAwfQ.local-stub',
                          user: { id: '' },
                          project: {
                            id: 1, name: 'local', storage: true, tools: [],
                            fonts: [
                              { label: 'Arial', value: 'arial,helvetica,sans-serif', url: '', defaultFont: true, weights: null },
                              { label: 'Georgia', value: 'georgia,palatino', url: '', defaultFont: true, weights: null },
                              { label: 'Times New Roman', value: 'times new roman,times', url: '', defaultFont: true, weights: null },
                              { label: 'Verdana', value: 'verdana,geneva', url: '', defaultFont: true, weights: null },
                              { label: 'Open Sans', value: "'Open Sans',sans-serif", url: '/fonts/fonts.css', defaultFont: true, weights: null },
                              { label: 'Inter', value: "'Inter',sans-serif", url: '/fonts/fonts.css', defaultFont: false, weights: null },
                              { label: 'Lato', value: "'Lato',sans-serif", url: '/fonts/fonts.css', defaultFont: true, weights: null },
                              { label: 'Montserrat', value: "'Montserrat',sans-serif", url: '/fonts/fonts.css', defaultFont: true, weights: null },
                              { label: 'Raleway', value: "'Raleway',sans-serif", url: '/fonts/fonts.css', defaultFont: true, weights: null },
                              { label: 'Rubik', value: "'Rubik',sans-serif", url: '/fonts/fonts.css', defaultFont: true, weights: null },
                              { label: 'Playfair Display', value: "'Playfair Display',serif", url: '/fonts/fonts.css', defaultFont: true, weights: null },
                              { label: 'Cabin', value: "'Cabin',sans-serif", url: '/fonts/fonts.css', defaultFont: true, weights: null },
                              { label: 'Pacifico', value: "'Pacifico',cursive", url: '/fonts/fonts.css', defaultFont: true, weights: null },
                              { label: 'Lobster Two', value: "'Lobster Two',cursive", url: '/fonts/fonts.css', defaultFont: true, weights: null }
                            ],
                            mergeTags: [], overrideDefaultFeatures: {}, defaultTheme: 'classic_light',
                            createdAt: '2020-01-01T00:00:00.000Z'
                          },
                          subscription: {
                            billingPlanId: 'complimentary', cancelsAt: null,
                            deactivatedAt: null, status: 'ACTIVE', expired: false,
                            entitlements: {
                              export: true, blocks: true, emailBuilder: true, pageBuilder: true,
                              popupBuilder: true, documentBuilder: true, preview: true,
                              customJS: true, customCSS: true, customFonts: true,
                              customStorage: true, customMergeTags: 1000, customBlocks: 10,
                              customTabs: 5, customTools: 5, customThemes: true,
                              customPreview: true, imageEditor: true, svgImageUpload: true,
                              undoRedo: true, darkMode: true, mobileDesignMode: true,
                              devicePreviews: true, displayConditions: true, amp: true,
                              analytics: true, appearance: true, audit: true,
                              userUploads: true, userUploadsProvider: true,
                              saveBlock: true, premiumTools: true, selectImage: true,
                              stockImages: true, locale: true, multiLanguage: true,
                              collaboration: true, smartButtons: true, smartHeadings: true,
                              smartMergeTags: true, smartText: true, specialLinks: true,
                              linkTypes: true, designTags: true, magicImage: true,
                              blockFolders: 0, campaignFolders: 1000, templateFolders: 1000,
                              teamLimit: 1000, liveProjects: 10, uploadMaxSize: 10000000,
                              exportHtmlLimit: 5000, assetBandwidthLimit: 1099511627776,
                              preheaderText: true, pageAnchors: true,
                              'textEditor.emojis': true, 'textEditor.tables': true,
                              'textEditor.fontSizes': true, 'textEditor.spellChecker': true,
                              'textEditor.textDirection': true, 'textEditor.cleanPaste': true,
                              table: true
                            },
                            items: {}, addons: {}
                          },
                          isAuthenticated: true
                        }
                      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
                    }
                    if (typeof url === 'string' && (
                      url.includes('api.unlayer.com') ||
                      url.includes('api.events.unlayer.com') ||
                      url.includes('api.tools.unlayer.com')
                    )) {
                      return new Response('{}', {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                      });
                    }
                    return origFetch(url, opts);
                  };
                })();
              `
            }}
            onReady={(unlayer) => {
              setEditorReady(true)
              unlayer.registerCallback('image', (file: any, done: any) => {
                const attachment: File = file.attachments[0]
                templateImagesApi
                  .upload(attachment, attachment.name)
                  .then((img) => done({ progress: 100, url: img.url }))
                  .catch(() => done({ progress: 0 }))
              })
            }}
            style={{ height: 'calc(100vh - 116px)', minHeight: 600 }}
          />
        </div>

        <div style={styles.sidebar}>
          <h3 style={styles.sideTitle}>Variables</h3>
          <p style={styles.hint}>
            Use <code>{'{{variableName}}'}</code> in the editor. Variables are auto-detected on save.
          </p>
          <div style={styles.varList}>
            {variables.map((v) => (
              <div key={v} style={styles.varItem}>
                <code style={styles.varCode}>{`{{${v}}}`}</code>
                <button style={styles.varRemove} onClick={() => removeVariable(v)}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <div style={styles.varAdd}>
            <input
              style={styles.varInput}
              value={newVar}
              onChange={(e) => setNewVar(e.target.value)}
              placeholder="variable name"
              onKeyDown={(e) => e.key === 'Enter' && addVariable()}
            />
            <button style={styles.btnAdd} onClick={addVariable}>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', height: '100vh' },
  toolbar: {
    display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px',
    borderBottom: '1px solid #e5e7eb', background: '#fff'
  },
  title: { margin: 0, flex: 1, fontSize: 18 },
  btnBack: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#374151'
  },
  btnSave: {
    background: '#2563eb', color: '#fff', padding: '8px 20px', border: 'none',
    borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 14
  },
  fields: {
    display: 'flex', gap: 16, padding: '12px 20px', borderBottom: '1px solid #e5e7eb',
    background: '#f9fafb'
  },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, flex: 1 },
  input: {
    padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 5,
    fontSize: 14, fontWeight: 400
  },
  layout: { display: 'flex', flex: 1 },
  editorWrap: { flex: 1 },
  sidebar: {
    width: 240, padding: '16px', borderLeft: '1px solid #e5e7eb',
    background: '#f9fafb', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8
  },
  sideTitle: { margin: '0 0 4px', fontSize: 14 },
  hint: { fontSize: 12, color: '#6b7280', margin: 0 },
  varList: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 },
  varItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, padding: '4px 8px'
  },
  varCode: { fontSize: 12, color: '#1d4ed8' },
  varRemove: {
    background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16
  },
  varAdd: { display: 'flex', gap: 6, marginTop: 8 },
  varInput: {
    flex: 1, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13
  },
  btnAdd: {
    background: '#f3f4f6', border: 'none', borderRadius: 4, padding: '6px 10px',
    cursor: 'pointer', fontSize: 13
  }
}
