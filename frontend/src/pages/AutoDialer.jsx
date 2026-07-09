import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/toastContext'
import {
  Upload, Play, Phone, SkipForward, ChevronLeft, RotateCcw,
  List, CheckCircle2, XCircle, ArrowLeftRight, PhoneCall,
  PoundSterling, FileSpreadsheet, FileText, Check, AlertCircle, Info
} from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'

// Custom local storage keys
const STORAGE_KEY = 'rt_dialer_campaign'

export default function AutoDialer() {
  const navigate = useNavigate()
  const { toast } = useToast()

  // Campaign State
  const [campaign, setCampaign] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse campaign from storage', e)
      }
    }
    return {
      leads: [],
      currentIndex: 0,
      history: [],
      isActive: false,
      mapping: {
        businessName: '',
        ownerName: '',
        phone: '',
        postcode: '',
        notes: ''
      },
      headers: [],
      rawRows: []
    }
  })

  // UI State
  const [dragActive, setDragActive] = useState(false)
  const [activeTab, setActiveTab] = useState('queue') // 'queue' | 'history'
  const fileInputRef = useRef(null)

  // Save campaign state to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaign))
  }, [campaign])

  // Helper to split CSV row, taking into account quoted values
  const parseRow = (rowText) => {
    const result = []
    let insideQuote = false
    let currentCell = ''
    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i]
      if (char === '"') {
        insideQuote = !insideQuote
      } else if (char === ',' && !insideQuote) {
        result.push(currentCell.trim().replace(/^"|"$/g, ''))
        currentCell = ''
      } else {
        currentCell += char
      }
    }
    result.push(currentCell.trim().replace(/^"|"$/g, ''))
    return result
  }

  // Handle uploaded file contents
  const handleFileContent = (text, fileName) => {
    const isCsv = fileName.toLowerCase().endsWith('.csv')
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '')

    if (lines.length === 0) {
      toast('The uploaded file is empty', 'error')
      return
    }

    if (isCsv) {
      const headers = parseRow(lines[0])
      const rawRows = []
      
      for (let i = 1; i < lines.length; i++) {
        const cells = parseRow(lines[i])
        if (cells.length > 0) {
          const rowObj = {}
          headers.forEach((header, index) => {
            const normalizedKey = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
            rowObj[normalizedKey] = cells[index] || ''
            rowObj[`_raw_${header}`] = cells[index] || ''
          })
          rawRows.push(rowObj)
        }
      }

      // Auto-detect columns
      const mapping = {
        businessName: '',
        ownerName: '',
        phone: '',
        postcode: '',
        notes: ''
      }

      headers.forEach(h => {
        const norm = h.trim().toLowerCase()
        if (norm.includes('business') || norm.includes('company') || norm.includes('firm') || norm.includes('org')) {
          mapping.businessName = h
        } else if (norm.includes('owner') || norm.includes('contact') || norm.includes('person') || norm.includes('name') || norm.includes('client')) {
          if (!mapping.ownerName && !mapping.businessName) mapping.ownerName = h
        } else if (norm.includes('phone') || norm.includes('mobile') || norm.includes('tel') || norm.includes('num') || norm.includes('call')) {
          mapping.phone = h
        } else if (norm.includes('postcode') || norm.includes('zip') || norm.includes('post') || norm.includes('addr')) {
          mapping.postcode = h
        } else if (norm.includes('note') || norm.includes('comment') || norm.includes('desc') || norm.includes('info')) {
          mapping.notes = h
        }
      })

      // Fallbacks if not auto-detected
      if (!mapping.phone && headers.length > 0) mapping.phone = headers.find(h => h.toLowerCase().includes('tel') || h.toLowerCase().includes('phone')) || headers[0]
      if (!mapping.businessName && headers.length > 0) mapping.businessName = headers.find(h => h.toLowerCase().includes('name')) || headers[0]

      setCampaign(prev => ({
        ...prev,
        headers,
        rawRows,
        mapping,
        leads: [],
        currentIndex: 0,
        history: [],
        isActive: false
      }))
      toast('CSV file uploaded and parsed successfully!', 'success')
    } else {
      // Text file mode: assume one phone number per line
      const rawRows = lines.map((line, index) => ({
        phone: line.trim(),
        businessName: `Lead #${index + 1}`,
        ownerName: '',
        postcode: '',
        notes: ''
      }))

      const mapping = {
        businessName: 'businessName',
        ownerName: 'ownerName',
        phone: 'phone',
        postcode: 'postcode',
        notes: 'notes'
      }

      const leads = rawRows.map(r => ({
        businessName: r.businessName,
        ownerName: '',
        phone: r.phone,
        postcode: '',
        notes: ''
      }))

      setCampaign(prev => ({
        ...prev,
        headers: ['Phone'],
        rawRows,
        mapping,
        leads,
        currentIndex: 0,
        history: [],
        isActive: true // Skip mapping screen for raw text lists
      }))
      toast('Text list loaded. Campaign started!', 'success')
    }
  }

  // File Upload Handlers
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        handleFileContent(event.target.result, file.name)
      }
      reader.readAsText(file)
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        handleFileContent(event.target.result, file.name)
      }
      reader.readAsText(file)
    }
  }

  // Start Campaign
  const startCampaign = () => {
    const { mapping, rawRows } = campaign
    if (!mapping.phone) {
      toast('You must select a Phone Number column mapping', 'error')
      return
    }

    const leads = rawRows.map(row => {
      // Find row keys matching selected mapping headers
      const getVal = (headerName) => {
        if (!headerName) return ''
        const key = headerName.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
        return row[key] || row[`_raw_${headerName}`] || ''
      }

      return {
        businessName: getVal(mapping.businessName) || 'Unknown Business',
        ownerName: getVal(mapping.ownerName) || '',
        phone: getVal(mapping.phone).replace(/\s+/g, ''),
        postcode: getVal(mapping.postcode) || '',
        notes: getVal(mapping.notes) || ''
      }
    }).filter(lead => lead.phone !== '')

    if (leads.length === 0) {
      toast('No valid phone numbers found in the file', 'error')
      return
    }

    setCampaign(prev => ({
      ...prev,
      leads,
      currentIndex: 0,
      history: [],
      isActive: true
    }))
    toast(`Campaign started with ${leads.length} leads!`, 'success')
  }

  // Reset Campaign
  const resetCampaign = () => {
    if (window.confirm('Are you sure you want to delete this campaign? All dialer progress and history will be lost.')) {
      setCampaign({
        leads: [],
        currentIndex: 0,
        history: [],
        isActive: false,
        mapping: {
          businessName: '',
          ownerName: '',
          phone: '',
          postcode: '',
          notes: ''
        },
        headers: [],
        rawRows: []
      })
      localStorage.removeItem(STORAGE_KEY)
      toast('Campaign cleared', 'info')
    }
  }

  // Active Lead Information
  const currentLead = campaign.leads[campaign.currentIndex] || null
  const totalLeads = campaign.leads.length
  const progressPercent = totalLeads > 0 ? Math.round((campaign.currentIndex / totalLeads) * 100) : 0

  // Initiate dialing using the system protocol
  const triggerDial = (phoneNum) => {
    if (!phoneNum) return
    const link = document.createElement('a')
    link.href = `tel:${phoneNum}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast(`Dialing ${phoneNum} via Vonage...`, 'info')
  }

  // Record outcome and go to next
  const recordOutcome = (outcome, details = '') => {
    if (!currentLead) return

    const logEntry = {
      ...currentLead,
      outcome,
      notes: details || currentLead.notes,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
    }

    setCampaign(prev => {
      const nextIndex = prev.currentIndex + 1
      const isFinished = nextIndex >= prev.leads.length

      return {
        ...prev,
        history: [logEntry, ...prev.history],
        currentIndex: isFinished ? prev.currentIndex : nextIndex,
        isActive: !isFinished
      }
    })

    if (campaign.currentIndex + 1 >= totalLeads) {
      toast('Auto-Dialer Campaign Completed!', 'success')
    } else {
      toast(`Outcome saved: ${outcome}`, 'success')
    }
  }

  // Conversion Redirect Helpers
  const handleConvert = (route, outcomeLabel) => {
    if (!currentLead) return

    // Standard prefill structure expected by AddCallback, AddTransfer, and SaleApplication
    const prefillData = {
      businessName: currentLead.businessName,
      ownerName: currentLead.ownerName,
      businessPhone: currentLead.phone,
      businessAddress: currentLead.postcode ? `, ${currentLead.postcode}` : '',
      postcode: currentLead.postcode,
      notes: currentLead.notes,
      utilityType: 'electricity'
    }

    // Save current outcome to history and advance in background before leaving
    const logEntry = {
      ...currentLead,
      outcome: outcomeLabel,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
    }

    setCampaign(prev => {
      const nextIndex = prev.currentIndex + 1
      const isFinished = nextIndex >= prev.leads.length

      return {
        ...prev,
        history: [logEntry, ...prev.history],
        currentIndex: isFinished ? prev.currentIndex : nextIndex,
        isActive: !isFinished
      }
    })

    // Navigate to page with prefilled state
    navigate(route, { state: { prefillData } })
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          {/* Header */}
          <div className="rt-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>Agent Auto-Dialer</h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>Upload spreadsheets or notepad files to dial leads quickly via Vonage</p>
            </div>
            {campaign.rawRows.length > 0 && (
              <button onClick={resetCampaign} className="rt-btn-primary" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 18px rgba(239, 68, 68, 0.35)', flex: 'none', padding: '10px 20px', fontSize: '13px' }}>
                <RotateCcw size={14} /> Reset Dialer
              </button>
            )}
          </div>

          {/* STAGE 1: UPLOAD FILE */}
          {!campaign.isActive && campaign.rawRows.length === 0 && (
            <div className="rt-fade rt-d1">
              <div 
                className={`rt-card ${dragActive ? 'border-indigo-500 bg-indigo-50/20' : ''}`}
                style={{ borderStyle: 'dashed', borderWidth: '2px', padding: '60px 40px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileInput} 
                  accept=".csv,.txt" 
                  style={{ display: 'none' }} 
                />
                <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Upload size={28} color="#6366f1" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Drag & Drop Excel or Notepad list</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 auto 24px', maxWidth: '380px' }}>
                  Supports **CSV** spreadsheets (with headers) or raw **TXT** notepad files (one phone number per line).
                </p>
                <button className="rt-btn-primary" style={{ margin: '0 auto', padding: '12px 24px', fontSize: '13px' }}>
                  Browse File
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2: COLUMN MAPPING */}
          {!campaign.isActive && campaign.rawRows.length > 0 && (
            <div className="rt-fade rt-d1 rt-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <FileSpreadsheet color="#6366f1" size={24} />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Map spreadsheet columns</h3>
                  <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0' }}>Select which columns correspond to contact fields. CRM will attempt to auto-detect them.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="rt-label">Phone Number <span className="rt-required">*</span></label>
                  <select 
                    value={campaign.mapping.phone} 
                    onChange={(e) => setCampaign(p => ({ ...p, mapping: { ...p.mapping, phone: e.target.value } }))}
                    className="rt-input"
                  >
                    <option value="">-- Select Column --</option>
                    {campaign.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="rt-label">Business Name</label>
                  <select 
                    value={campaign.mapping.businessName} 
                    onChange={(e) => setCampaign(p => ({ ...p, mapping: { ...p.mapping, businessName: e.target.value } }))}
                    className="rt-input"
                  >
                    <option value="">-- None (Auto Label) --</option>
                    {campaign.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="rt-label">Owner / Contact Person</label>
                  <select 
                    value={campaign.mapping.ownerName} 
                    onChange={(e) => setCampaign(p => ({ ...p, mapping: { ...p.mapping, ownerName: e.target.value } }))}
                    className="rt-input"
                  >
                    <option value="">-- None --</option>
                    {campaign.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="rt-label">Postcode / ZIP</label>
                  <select 
                    value={campaign.mapping.postcode} 
                    onChange={(e) => setCampaign(p => ({ ...p, mapping: { ...p.mapping, postcode: e.target.value } }))}
                    className="rt-input"
                  >
                    <option value="">-- None --</option>
                    {campaign.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="rt-label">Notes / Additional Info</label>
                  <select 
                    value={campaign.mapping.notes} 
                    onChange={(e) => setCampaign(p => ({ ...p, mapping: { ...p.mapping, notes: e.target.value } }))}
                    className="rt-input"
                  >
                    <option value="">-- None --</option>
                    {campaign.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setCampaign(p => ({ ...p, rawRows: [], headers: [] }))}
                  className="rt-btn-primary" 
                  style={{ background: '#f1f5f9', color: '#475569', boxShadow: 'none' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={startCampaign}
                  className="rt-btn-primary"
                  disabled={!campaign.mapping.phone}
                >
                  <Play size={15} /> Start Call Campaign ({campaign.rawRows.length} Leads)
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: ACTIVE CAMPAIGN DIALER */}
          {campaign.isActive && campaign.leads.length > 0 && (
            <div className="rt-fade grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* LEFT & CENTER PANEL (Active Lead + Call Actions) */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* Progress bar */}
                <div className="rt-card" style={{ padding: '16px 20px' }}>
                  <div className="flex justify-between items-center mb-2.5 text-xs font-bold text-slate-500">
                    <span>CAMPAIGN PROGRESS</span>
                    <span>{campaign.currentIndex + 1} / {totalLeads} LEADS ({progressPercent}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(135deg,#6366f1,#7c3aed)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                  </div>
                </div>

                {/* Active Lead Details */}
                {currentLead ? (
                  <div className="rt-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div className="rt-card-header" style={{ background: 'rgba(99,102,241,0.02)', display: 'flex', alignItems: 'center' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-[pulse_1.5s_infinite]" />
                        <span className="rt-card-title">Active Calling Lead</span>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600">
                        PENDING DIAL
                      </span>
                    </div>

                    <div className="rt-card-body flex-1">
                      <div style={{ marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', textTransform: 'capitalize' }}>
                          {currentLead.businessName}
                        </h2>
                        {currentLead.ownerName && (
                          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                            Contact: <strong className="text-slate-800">{currentLead.ownerName}</strong>
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                        <div style={{ padding: '14px', background: '#fafafa', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px' }}>PHONE NUMBER</span>
                          <p style={{ fontSize: '16px', fontWeight: 700, color: '#4f46e5', margin: '4px 0 0' }}>{currentLead.phone}</p>
                        </div>

                        <div style={{ padding: '14px', background: '#fafafa', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px' }}>POSTCODE</span>
                          <p style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>{currentLead.postcode || 'N/A'}</p>
                        </div>
                      </div>

                      {currentLead.notes && (
                        <div style={{ marginBottom: '24px' }}>
                          <span className="rt-label">Import Notes</span>
                          <p style={{ fontSize: '13px', color: '#475569', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #eef2f6', margin: '4px 0 0', lineHeight: 1.5 }}>
                            {currentLead.notes}
                          </p>
                        </div>
                      )}

                      {/* Main Dialer Buttons */}
                      <div className="flex flex-col gap-4 mt-8">
                        <button 
                          onClick={() => triggerDial(currentLead.phone)}
                          className="rt-btn-primary w-full py-4 text-base"
                          style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 18px rgba(16, 185, 129, 0.35)' }}
                        >
                          <Phone size={18} /> Launch Call via Vonage
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => recordOutcome('No Answer / Busy')}
                            className="rt-btn-primary" 
                            style={{ background: '#f1f5f9', color: '#475569', boxShadow: 'none', fontSize: '13px' }}
                          >
                            <XCircle size={15} color="#ef4444" /> No Answer / Busy
                          </button>
                          <button 
                            onClick={() => recordOutcome('Not Interested')}
                            className="rt-btn-primary"
                            style={{ background: '#f1f5f9', color: '#475569', boxShadow: 'none', fontSize: '13px' }}
                          >
                            <XCircle size={15} color="#64748b" /> Not Interested
                          </button>
                        </div>

                        {/* CRM Conversions */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <span className="rt-label" style={{ marginBottom: '12px' }}>Save & Convert Lead</span>
                          <div className="grid grid-cols-3 gap-2">
                            <button 
                              onClick={() => handleConvert('/callbacks/add', 'Callback Scheduled')}
                              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-indigo-100 bg-indigo-50 hover:bg-indigo-100/70 text-indigo-700 font-bold text-[11px] transition-all cursor-pointer"
                            >
                              <PhoneCall size={16} /> Callback
                            </button>
                            <button 
                              onClick={() => handleConvert('/transfers/add', 'Transfer Initiated')}
                              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-blue-100 bg-blue-50 hover:bg-blue-100/70 text-blue-700 font-bold text-[11px] transition-all cursor-pointer"
                            >
                              <ArrowLeftRight size={16} /> Transfer
                            </button>
                            <button 
                              onClick={() => handleConvert('/sales/apply', 'Sale Created')}
                              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-emerald-100 bg-emerald-50 hover:bg-emerald-100/70 text-emerald-700 font-bold text-[11px] transition-all cursor-pointer"
                            >
                              <PoundSterling size={16} /> Create Sale
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pagination / Navigation Footer */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-16 flex items-center justify-between">
                      <button 
                        onClick={() => setCampaign(p => ({ ...p, currentIndex: Math.max(0, p.currentIndex - 1) }))}
                        disabled={campaign.currentIndex === 0}
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft size={16} /> Back
                      </button>
                      <span className="text-xs text-slate-400 font-semibold">LEAD INDEX: {campaign.currentIndex + 1} / {totalLeads}</span>
                      <button 
                        onClick={() => setCampaign(p => ({ ...p, currentIndex: Math.min(totalLeads - 1, p.currentIndex + 1) }))}
                        disabled={campaign.currentIndex === totalLeads - 1}
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 disabled:opacity-30 cursor-pointer"
                      >
                        Skip <SkipForward size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rt-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <CheckCircle2 size={24} color="#10b981" />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Campaign Completed!</h3>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>You have finished calling all leads in this campaign.</p>
                    <button onClick={resetCampaign} className="rt-btn-primary" style={{ margin: '0 auto' }}>
                      Upload New List
                    </button>
                  </div>
                )}
              </div>

              {/* RIGHT PANEL (Campaign Queue & History Tab) */}
              <div className="rt-card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content', maxHeight: '680px' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', background: '#fafbfc', borderRadius: '16px 16px 0 0' }}>
                  <button 
                    onClick={() => setActiveTab('queue')}
                    className="flex-1 py-3 text-xs font-bold border-none cursor-pointer transition-all duration-200"
                    style={{ 
                      color: activeTab === 'queue' ? '#6366f1' : '#64748b',
                      borderBottom: activeTab === 'queue' ? '2.5px solid #6366f1' : '2.5px solid transparent',
                      background: activeTab === 'queue' ? '#ffffff' : 'transparent',
                      borderRadius: '16px 0 0 0'
                    }}
                  >
                    <span className="flex items-center justify-center gap-1.5"><List size={14} /> Dialer Queue ({totalLeads - campaign.currentIndex})</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('history')}
                    className="flex-1 py-3 text-xs font-bold border-none cursor-pointer transition-all duration-200"
                    style={{ 
                      color: activeTab === 'history' ? '#6366f1' : '#64748b',
                      borderBottom: activeTab === 'history' ? '2.5px solid #6366f1' : '2.5px solid transparent',
                      background: activeTab === 'history' ? '#ffffff' : 'transparent',
                      borderRadius: '0 16px 0 0'
                    }}
                  >
                    <span className="flex items-center justify-center gap-1.5"><CheckCircle2 size={14} /> Call History ({campaign.history.length})</span>
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 p-4 scrollbar-thin" style={{ minHeight: '300px', maxHeight: '580px' }}>
                  
                  {/* TAB 1: QUEUE LIST */}
                  {activeTab === 'queue' && (
                    <div className="flex flex-col gap-2.5">
                      {campaign.leads.slice(campaign.currentIndex).map((lead, idx) => {
                        const actualIdx = campaign.currentIndex + idx
                        const isActiveLead = actualIdx === campaign.currentIndex
                        return (
                          <div 
                            key={actualIdx}
                            onClick={() => setCampaign(p => ({ ...p, currentIndex: actualIdx }))}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${isActiveLead ? 'border-indigo-200 bg-indigo-50/40 shadow-sm' : 'border-slate-100 hover:border-slate-300'}`}
                          >
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <span className="text-xs font-bold text-slate-400 shrink-0">#{actualIdx + 1}</span>
                              <div className="min-w-0 flex-1">
                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }} className="truncate capitalize">{lead.businessName}</p>
                                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }} className="truncate">{lead.phone} {lead.postcode ? `• ${lead.postcode}` : ''}</p>
                              </div>
                              {isActiveLead && (
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {campaign.leads.slice(campaign.currentIndex).length === 0 && (
                        <p className="text-center text-xs text-slate-400 font-semibold py-8">Queue is empty</p>
                      )}
                    </div>
                  )}

                  {/* TAB 2: HISTORY LIST */}
                  {activeTab === 'history' && (
                    <div className="flex flex-col gap-2.5">
                      {campaign.history.map((log, idx) => {
                        const isSuccess = log.outcome.includes('Created') || log.outcome.includes('Scheduled') || log.outcome.includes('Initiated')
                        const isNotInterested = log.outcome === 'Not Interested'
                        const isNoAnswer = log.outcome === 'No Answer / Busy'

                        return (
                          <div 
                            key={idx}
                            className="p-3 rounded-xl border border-slate-100 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }} className="truncate capitalize">{log.businessName}</p>
                              <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }} className="truncate">{log.phone} • {log.timestamp}</p>
                            </div>
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0"
                              style={{
                                background: isSuccess ? '#ecfdf5' : isNotInterested ? '#f1f5f9' : '#fef2f2',
                                color: isSuccess ? '#047857' : isNotInterested ? '#475569' : '#b91c1c'
                              }}
                            >
                              {log.outcome}
                            </span>
                          </div>
                        )
                      })}
                      {campaign.history.length === 0 && (
                        <p className="text-center text-xs text-slate-400 font-semibold py-8">No calls logged yet</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </>
  )
}
