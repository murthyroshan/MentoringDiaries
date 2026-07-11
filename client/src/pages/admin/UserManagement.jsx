import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Filter, Eye, Edit2, UserX, UserCheck,
  ChevronLeft, ChevronRight, AlertTriangle, Check, X,
} from 'lucide-react'
import api from '../../services/api'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  void:    '#06060A',
  border:  'rgba(255,255,255,0.06)',
  text:    '#F2F0E8',
  muted:   'rgba(242,240,232,0.45)',
  subtle:  'rgba(242,240,232,0.18)',
  purple:  '#7F77DD',
  teal:    '#1D9E75',
  amber:   '#EF9F27',
  red:     '#E24B4A',
}

const glass = {
  background: 'rgba(17,17,24,0.75)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '20px',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name = '') {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase()
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Sk = ({ h = 20, w = '100%', r = 8 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'rgba(255,255,255,0.05)', animation: 'umPulse 1.6s ease-in-out infinite' }} />
)

// ─── Error card ───────────────────────────────────────────────────────────────
function ErrCard({ msg, onRetry }) {
  return (
    <div style={{ ...glass, border: `1px solid rgba(226,75,74,0.2)`, textAlign: 'center', padding: '28px' }}>
      <AlertTriangle size={20} color={C.red} style={{ marginBottom: 8 }} />
      <div style={{ fontSize: '13px', color: C.muted, marginBottom: '12px' }}>{msg}</div>
      <button onClick={onRetry} style={{ background: 'rgba(226,75,74,0.1)', border: `1px solid rgba(226,75,74,0.25)`, borderRadius: '8px', padding: '6px 16px', color: C.red, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>Retry</button>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type = 'success', onClose }) {
  const col = type === 'success' ? C.teal : C.red
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
        background: type === 'success' ? 'rgba(29,158,117,0.15)' : 'rgba(226,75,74,0.15)',
        border: `1px solid ${col}40`, borderRadius: '12px', padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: '10px',
        color: col, fontSize: '13px', fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
      {type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
      {msg}
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: col }}><X size={12} /></button>
    </motion.div>
  )
}

// ─── User modal (Add/Edit) ────────────────────────────────────────────────────
function UserModal({ user, onClose, onSuccess }) {
  const isEdit = !!user
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'student',
    department: user?.department || '',
    section: user?.section || '',
    roll_number: user?.roll_number || '',
    batch: user?.batch || '',
    current_semester: user?.current_semester || 4,
    is_active: user?.is_active !== undefined ? !!user.is_active : true,
  })
  const [err, setErr] = useState('')

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? api.patch(`/users/${user.id}`, data)
      // Use the admin-only create endpoint — /auth/register would set auth
      // cookies and silently log the admin in as the newly-created user.
      : api.post('/admin/users', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      onSuccess()
      onClose()
    },
    onError: (e) => setErr(e?.response?.data?.message || 'Request failed'),
  })

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  function submit(e) {
    e.preventDefault()
    if (!form.name || !form.email) { setErr('Name and email are required'); return }
    if (!isEdit && !form.password) { setErr('Password is required'); return }
    const payload = { ...form, is_active: form.is_active ? 1 : 0 }
    if (isEdit) delete payload.password
    mutation.mutate(payload)
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
    borderRadius: '8px', padding: '8px 12px', color: C.text,
    fontSize: '13px', fontFamily: 'inherit', width: '100%',
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px', display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ ...glass, width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>{isEdit ? 'Edit user' : 'Add user'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Full name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} placeholder="Student Name" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Email *</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} placeholder="email@example.com" type="email" />
            </div>
            {!isEdit && (
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Password *</label>
                <input value={form.password} onChange={e => set('password', e.target.value)} style={inputStyle} placeholder="Min 8 chars, 1 uppercase, 1 number" type="password" />
              </div>
            )}
            <div>
              <label style={labelStyle}>Role</label>
              <select value={form.role} onChange={e => set('role', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {['student', 'mentor', 'admin'].map(r => <option key={r} value={r} style={{ background: '#111118', textTransform: 'capitalize' }}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <select value={form.department} onChange={e => set('department', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="" style={{ background: '#111118' }}>Select dept</option>
                {['CSE', 'AIML', 'CS', 'DS'].map(d => <option key={d} value={d} style={{ background: '#111118' }}>{d}</option>)}
              </select>
            </div>
            {form.role === 'student' && (
              <>
                <div>
                  <label style={labelStyle}>Section</label>
                  <select value={form.section} onChange={e => set('section', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="" style={{ background: '#111118' }}>Select section</option>
                    {(form.department === 'CSE' ? ['A','B','C','D'] : ['A','B']).map(s => <option key={s} value={s} style={{ background: '#111118' }}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Roll number</label>
                  <input value={form.roll_number} onChange={e => set('roll_number', e.target.value)} style={inputStyle} placeholder="1-20" type="number" min={1} max={20} />
                </div>
                <div>
                  <label style={labelStyle}>Batch</label>
                  <input value={form.batch} onChange={e => set('batch', e.target.value)} style={inputStyle} placeholder="2024-28" />
                </div>
                <div>
                  <label style={labelStyle}>Semester</label>
                  <select value={form.current_semester} onChange={e => set('current_semester', Number(e.target.value))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s} style={{ background: '#111118' }}>Sem {s}</option>)}
                  </select>
                </div>
              </>
            )}
            {isEdit && (
              <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
                <label htmlFor="is_active" style={{ fontSize: '13px', color: C.text, cursor: 'pointer' }}>Active account</label>
              </div>
            )}
          </div>
          {err && <div style={{ fontSize: '12px', color: C.red, marginBottom: '10px' }}>{err}</div>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '9px', borderRadius: '9px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
            <button type="submit" disabled={mutation.isPending} style={{ flex: 2, padding: '9px', borderRadius: '9px', background: C.purple, border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: 600, opacity: mutation.isPending ? 0.7 : 1 }}>
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function UserManagement() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const reduced = useReducedMotion()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [deptFilter, setDeptFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [editUser, setEditUser] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState(null)
  const LIMIT = 20

  const params = useMemo(() => {
    const p = { page, limit: LIMIT }
    // The pills are plural ('Students'); the API expects the singular role enum
    // ('student') and 400s on anything else.
    const ROLE_PARAM = { Students: 'student', Mentors: 'mentor', Admins: 'admin' }
    if (roleFilter !== 'All') p.role = ROLE_PARAM[roleFilter] || roleFilter.toLowerCase()
    if (deptFilter !== 'All') p.department = deptFilter
    if (search) p.search = search
    return p
  }, [search, roleFilter, deptFilter, page])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => api.get('/users', { params }).then(r => r.data),
    staleTime: 30_000, retry: 1,
    keepPreviousData: true,
  })

  const users = data?.data || []
  const pagination = data?.pagination || { total: 0, pages: 1, page: 1 }

  const deactivateMutation = useMutation({
    mutationFn: (id) => api.patch(`/users/${id}`, { is_active: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setToast({ msg: 'User deactivated', type: 'success' })
      setConfirmDeactivate(null)
    },
    onError: () => setToast({ msg: 'Failed to deactivate', type: 'error' }),
  })

  function PillBtn({ label, active, onClick }) {
    return (
      <button onClick={onClick} style={{
        padding: '5px 14px', borderRadius: '999px', fontSize: '12px',
        fontFamily: 'inherit', cursor: 'pointer',
        background: active ? C.purple : 'rgba(255,255,255,0.05)',
        border: `1px solid ${active ? C.purple : C.border}`,
        color: active ? '#fff' : C.muted, transition: 'all 0.15s',
      }}>{label}</button>
    )
  }

  const thStyle = { padding: '8px 12px', textAlign: 'left', fontSize: '10px', color: C.muted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, background: 'none', border: 'none' }

  function roleAccent(role) {
    if (role === 'admin') return C.red
    if (role === 'mentor') return C.purple
    return C.teal
  }

  return (
    <>
      <style>{`@keyframes umPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
      <AnimatePresence>
        {toast && <Toast key="toast" msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
      {(editUser !== null) && <UserModal user={editUser} onClose={() => setEditUser(null)} onSuccess={() => setToast({ msg: 'User updated', type: 'success' })} />}
      {showAdd && <UserModal onClose={() => setShowAdd(false)} onSuccess={() => setToast({ msg: 'User created', type: 'success' })} />}

      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ maxWidth: '1280px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontFamily: '"Sora",system-ui,sans-serif', fontSize: '24px', fontWeight: 700, color: C.text, margin: 0 }}>
              User management
            </h1>
            <p style={{ fontSize: '13px', color: C.muted, margin: '5px 0 0' }}>
              {pagination.total} users total
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              background: C.purple, border: 'none', borderRadius: '10px',
              padding: '9px 18px', color: '#fff', cursor: 'pointer',
              fontSize: '13px', fontFamily: 'inherit', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '7px',
            }}
          >
            <Plus size={14} /> Add user
          </button>
        </div>

        {/* Filters */}
        <div style={{ ...glass, marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '6px 10px', flex: '1', minWidth: '200px' }}>
            <Search size={13} color={C.muted} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search name, email, roll..."
              style={{ background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: '12px', fontFamily: 'inherit', width: '100%' }}
            />
          </div>
          {/* Role */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['All', 'Students', 'Mentors', 'Admins'].map(r => (
              <PillBtn key={r} label={r} active={roleFilter === r} onClick={() => { setRoleFilter(r); setPage(1) }} />
            ))}
          </div>
          {/* Dept */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['All', 'CSE', 'AIML', 'CS', 'DS'].map(d => (
              <PillBtn key={d} label={d} active={deptFilter === d} onClick={() => { setDeptFilter(d); setPage(1) }} />
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={glass}>
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1,2,3,4,5].map(i => <Sk key={i} h={42} />)}
            </div>
          )}
          {isError && <ErrCard msg="Failed to load users" onRetry={refetch} />}
          {!isLoading && !isError && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    {['User', 'Role', 'Department', 'Identifier', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ ...thStyle, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: `${roleAccent(u.role)}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 700, color: roleAccent(u.role),
                          }}>{getInitials(u.name)}</div>
                          <div>
                            <div style={{ color: C.text, fontWeight: 500 }}>{u.name}</div>
                            <div style={{ fontSize: '11px', color: C.muted }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: '11px', padding: '2px 9px', borderRadius: '999px',
                          background: `${roleAccent(u.role)}15`, color: roleAccent(u.role),
                          border: `1px solid ${roleAccent(u.role)}30`, textTransform: 'capitalize',
                        }}>{u.role}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: C.muted }}>{u.department || '—'}</td>
                      <td style={{ padding: '10px 12px', color: C.muted, fontSize: '12px' }}>
                        {u.role === 'student'
                          ? `${u.section ? `Sec ${u.section} · ` : ''}${u.roll_number ? `Roll ${u.roll_number}` : '—'}`
                          : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: '11px', padding: '2px 9px', borderRadius: '999px',
                          background: u.is_active ? 'rgba(29,158,117,0.1)' : 'rgba(226,75,74,0.1)',
                          color: u.is_active ? C.teal : C.red,
                          border: `1px solid ${u.is_active ? 'rgba(29,158,117,0.25)' : 'rgba(226,75,74,0.25)'}`,
                        }}>{u.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {u.role === 'student' && (
                            <button
                              onClick={() => navigate(`/admin/students/${u.id}`)}
                              title="View report"
                              style={{ background: 'rgba(127,119,221,0.08)', border: `1px solid rgba(127,119,221,0.2)`, borderRadius: '6px', padding: '4px 7px', color: C.purple, cursor: 'pointer' }}
                            >
                              <Eye size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => setEditUser(u)}
                            title="Edit"
                            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '6px', padding: '4px 7px', color: C.muted, cursor: 'pointer' }}
                          >
                            <Edit2 size={12} />
                          </button>
                          {u.is_active ? (
                            confirmDeactivate?.id === u.id ? (
                              <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: C.muted }}>Sure?</span>
                                <button onClick={() => deactivateMutation.mutate(u.id)} style={{ background: 'rgba(226,75,74,0.1)', border: `1px solid rgba(226,75,74,0.2)`, borderRadius: '6px', padding: '3px 7px', color: C.red, cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit' }}>Yes</button>
                                <button onClick={() => setConfirmDeactivate(null)} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: '6px', padding: '3px 7px', color: C.muted, cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit' }}>No</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeactivate(u)}
                                title="Deactivate"
                                style={{ background: 'rgba(226,75,74,0.06)', border: `1px solid rgba(226,75,74,0.15)`, borderRadius: '6px', padding: '4px 7px', color: C.red, cursor: 'pointer' }}
                              >
                                <UserX size={12} />
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => { api.patch(`/users/${u.id}`, { is_active: true }).then(() => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setToast({ msg: 'User reactivated', type: 'success' }) }) }}
                              title="Reactivate"
                              style={{ background: 'rgba(29,158,117,0.06)', border: `1px solid rgba(29,158,117,0.15)`, borderRadius: '6px', padding: '4px 7px', color: C.teal, cursor: 'pointer' }}
                            >
                              <UserCheck size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: C.muted, fontSize: '13px' }}>No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '5px 10px', color: page === 1 ? C.subtle : C.muted, cursor: page === 1 ? 'default' : 'pointer' }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '12px', color: C.muted }}>Page {page} of {pagination.pages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '5px 10px', color: page === pagination.pages ? C.subtle : C.muted, cursor: page === pagination.pages ? 'default' : 'pointer' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
