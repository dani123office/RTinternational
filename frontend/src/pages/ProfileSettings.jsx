import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toastContext'
import api from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'
import { Loader2, User, Mail, Phone, Shield, Calendar, Save, Building2, Percent, UserSquare2 } from 'lucide-react'
import ResetPasswordModal from '@/components/admin/ResetPasswordModal'

export default function ProfileSettings() {
  const { user } = useAuthStore()
  const { toast } = useToast()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const isManager = user?.role === 'manager'
  const isAdmin = user?.role === 'admin'
  const gradient = isManager ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : isAdmin ? 'linear-gradient(135deg, #0f172a, #1e293b)' : 'linear-gradient(135deg, #6366f1, #3b82f6)'
  const accentColor = isManager ? '#7c3aed' : isAdmin ? '#0f172a' : '#6366f1'

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/api/profile')
        const p = res.data
        setProfile(p)
        setName(p.name || '')
        setEmail(p.email || '')
        setPhone(p.phone || '')
      } catch {
        toast('Failed to load profile', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = { name: name.trim(), email: email.trim(), phone: phone.trim() || null }
      const res = await api.put('/api/profile', body)
      setProfile(res.data)
      toast('Profile updated successfully', 'success')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update profile'
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const roleBadgeStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '4px 12px', borderRadius: '20px', fontSize: '11px',
    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
    background: isManager ? '#f5f3ff' : isAdmin ? '#f1f5f9' : '#eef2ff',
    color: accentColor,
  }

  if (loading) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="rt-page">
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <Loader2 size={32} className="rt-spin" style={{ color: accentColor }} />
            <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>Loading profile...</span>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div className="rt-fade" style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>Profile Settings</h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>Manage your account information and password</p>
          </div>

          {/* Profile Card */}
          <div className="rt-card rt-fade rt-d1" style={{ marginBottom: '20px' }}>
            <div className="rt-card-body" style={{ padding: 0 }}>
              <div style={{
                background: gradient,
                padding: '32px 28px 28px',
                borderRadius: '14px 14px 0 0',
                display: 'flex', alignItems: 'center', gap: '20px',
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '16px',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <User size={28} color="white" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ color: 'white', fontSize: '18px', fontWeight: 700, margin: 0 }}>{profile.name}</h2>
                  <span style={roleBadgeStyle}>
                    <Shield size={11} />
                    {profile.role}
                  </span>
                  {profile.commissionRate !== null && profile.commissionRate !== undefined && (
                    <span style={{
                      ...roleBadgeStyle, marginLeft: '8px',
                      background: 'rgba(255,255,255,0.15)', color: 'white',
                    }}>
                      <Percent size={11} />
                      {profile.commissionRate}% Commission
                    </span>
                  )}
                </div>
              </div>

              <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '13px' }}>
                  <Mail size={15} />
                  <span style={{ color: '#0f172a', fontWeight: 500 }}>{profile.email}</span>
                </div>
                {profile.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '13px' }}>
                    <Phone size={15} />
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{profile.phone}</span>
                  </div>
                )}
                {profile.managerId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '13px' }}>
                    <Building2 size={15} />
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>Managed account</span>
                  </div>
                )}
                {(profile.dateOfJoining || profile.createdAt) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '13px' }}>
                    <Calendar size={15} />
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                      Member since {new Date(profile.dateOfJoining || profile.createdAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="rt-card rt-fade rt-d2" style={{ marginBottom: '20px' }}>
            <div className="rt-card-header">
              <div className="rt-card-header-left">
                <div className="rt-card-icon" style={{ background: `${accentColor}15` }}>
                  <User size={16} style={{ color: accentColor }} />
                </div>
                <span className="rt-card-title">Edit Profile</span>
              </div>
            </div>
            <div className="rt-card-body" style={{ padding: '24px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      padding: '10px 14px', border: '1px solid #e2e6ec', borderRadius: '10px',
                      fontSize: '14px', color: '#0f172a', outline: 'none',
                      background: '#f8fafc', transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = accentColor }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e6ec' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      padding: '10px 14px', border: '1px solid #e2e6ec', borderRadius: '10px',
                      fontSize: '14px', color: '#0f172a', outline: 'none',
                      background: '#f8fafc', transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = accentColor }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e6ec' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 1234 567890"
                    style={{
                      padding: '10px 14px', border: '1px solid #e2e6ec', borderRadius: '10px',
                      fontSize: '14px', color: '#0f172a', outline: 'none',
                      background: '#f8fafc', transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = accentColor }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e6ec' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Staff Details Section */}
          {profile && (profile.fatherName || profile.cnic || profile.department || profile.designation || profile.monthlySalary || profile.dateOfBirth || profile.dateOfJoining || profile.emergContactName || profile.emergContactNumber) && (
            <div className="rt-card rt-fade rt-d3" style={{ marginBottom: '24px' }}>
              <div className="rt-card-header">
                <div className="rt-card-header-left">
                  <div className="rt-card-icon" style={{ background: 'rgba(99,102,241,0.1)' }}>
                    <UserSquare2 size={16} color="#6366f1" />
                  </div>
                  <span className="rt-card-title">Employment & Staff Details</span>
                </div>
              </div>
              <div className="rt-card-body" style={{ padding: '24px 28px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 28px' }}>
                  {profile.fatherName && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Father's Name</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{profile.fatherName}</p>
                    </div>
                  )}
                  {profile.cnic && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>CNIC</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{profile.cnic}</p>
                    </div>
                  )}
                  {profile.designation && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Designation</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{profile.designation}</p>
                    </div>
                  )}
                  {profile.department && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Department</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{profile.department}</p>
                    </div>
                  )}
                  {profile.monthlySalary !== null && profile.monthlySalary !== undefined && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Monthly Salary</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Rs. {Number(profile.monthlySalary).toLocaleString()}</p>
                    </div>
                  )}
                  {profile.phone && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Telephone</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{profile.phone}</p>
                    </div>
                  )}
                  {profile.dateOfBirth && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Date of Birth</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{new Date(profile.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  )}
                  {profile.dateOfJoining && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Date of Joining</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{new Date(profile.dateOfJoining).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  )}
                  {profile.emergContactName && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Emergency Contact</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{profile.emergContactName}{profile.emergContactNumber ? ` (${profile.emergContactNumber})` : ''}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Change Password for Admin */}
          {isAdmin && (
            <div className="rt-card rt-fade rt-d4" style={{ marginBottom: '20px' }}>
              <div className="rt-card-header">
                <div className="rt-card-header-left">
                  <div className="rt-card-icon" style={{ background: `${accentColor}15` }}>
                    <Shield size={16} style={{ color: accentColor }} />
                  </div>
                  <span className="rt-card-title">Change Password</span>
                </div>
              </div>
              <div className="rt-card-body" style={{ padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '14px', color: '#334155', margin: 0 }}>Admins can change their password here.</p>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  style={{
                    padding: '8px 20px', border: '1px solid #e2e6ec', borderRadius: '10px',
                    cursor: 'pointer', background: 'white', color: '#0f172a',
                    fontWeight: 600, fontSize: '13px', transition: 'border-color 0.15s',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => { e.target.style.borderColor = accentColor }}
                  onMouseLeave={(e) => { e.target.style.borderColor = '#e2e6ec' }}
                >
                  Change Password
                </button>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="rt-fade rt-d4" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 28px', border: 'none', borderRadius: '12px',
                cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? '#94a3b8' : gradient,
                color: 'white', fontWeight: 600, fontSize: '14px',
                transition: 'opacity 0.15s',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? <Loader2 size={16} className="rt-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {isAdmin && showPasswordModal && (
            <ResetPasswordModal
              userId={user.id}
              userName={profile.name}
              onClose={() => setShowPasswordModal(false)}
              onSuccess={() => {
                toast('Password changed successfully', 'success')
                setShowPasswordModal(false)
              }}
            />
          )}
        </div>
      </div>
    </>
  )
}
