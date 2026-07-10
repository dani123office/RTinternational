import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/toastContext'
import api, { endpoints } from '@/lib/api'
import {
  Upload, Play, Phone, SkipForward, ChevronLeft, RotateCcw,
  List, CheckCircle2, XCircle, ArrowLeftRight, PhoneCall,
  PoundSterling, FileSpreadsheet, FileText, Check, AlertCircle, Info, Trash2
} from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'

export default function AutoDialer() {
  const navigate = useNavigate()
  const { toast } = useToast()

  // Campaigns list state
  const [campaigns, setCampaigns] = useState(() => {
    const saved = localStorage.getItem('rt_dialer_campaigns')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse campaigns from storage', e)
      }
    }
    return []
  })

  // Active Campaign ID state
  const [activeCampaignId, setActiveCampaignId] = useState(() => {
    return localStorage.getItem('rt_dialer_active_campaign_id') || null
  })

  // UI State
  const [dragActive, setDragActive] = useState(false)
  const [activeTab, setActiveTab] = useState('queue') // 'queue' | 'history'
  const fileInputRef = useRef(null)
  
  const [autoDialNext, setAutoDialNext] = useState(() => {
    const saved = localStorage.getItem('rt_autodial_next')
    return saved === 'true'
  })

  // Save campaigns to storage
  useEffect(() => {
    localStorage.setItem('rt_dialer_campaigns', JSON.stringify(campaigns))
  }, [campaigns])

  // Save active campaign ID to storage
  useEffect(() => {
    if (activeCampaignId) {
      localStorage.setItem('rt_dialer_active_campaign_id', activeCampaignId)
    } else {
      localStorage.removeItem('rt_dialer_active_campaign_id')
    }
  }, [activeCampaignId])

  const [dbCampaigns, setDbCampaigns] = useState([])
  const [loadingDb, setLoadingDb] = useState(false)

  const loadDbCampaigns = useCallback(async () => {
    setLoadingDb(true)
    try {
      const res = await api.get(endpoints.campaigns.base)
      const mapped = res.data.map(c => ({
        id: `db-${c.id}`,
        dbId: c.id,
        name: c.name,
        isDb: true,
        totalLeads: c.totalLeads,
        calledLeads: c.calledLeads,
        pendingLeads: c.pendingLeads,
        isActive: c.status === 'active',
        createdAt: c.createdAt,
        outcomeStats: c.outcomeStats
      }))
      setDbCampaigns(mapped)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDb(false)
    }
  }, [])

  useEffect(() => {
    loadDbCampaigns()
  }, [loadDbCampaigns])

  useEffect(() => {
    if (activeCampaignId && activeCampaignId.toString().startsWith('db-')) {
      const dbId = Number(activeCampaignId.replace('db-', ''))
      const current = dbCampaigns.find(c => c.id === activeCampaignId)
      if (current && !current.leads) {
        api.get(endpoints.campaigns.leads(dbId)).then(res => {
          const leads = res.data.map(l => ({
            id: l.id,
            businessName: l.businessName,
            ownerName: l.ownerName || '',
            phone: l.phone,
            postcode: l.postcode || '',
            notes: l.notes || '',
            status: l.status,
            outcome: l.outcome
          }))
          let firstPendingIdx = leads.findIndex(l => l.status === 'pending')
          if (firstPendingIdx === -1) firstPendingIdx = 0
          
          setDbCampaigns(prev => prev.map(c => {
            if (c.id === activeCampaignId) {
              return { ...c, leads, currentIndex: firstPendingIdx, history: [] }
            }
            return c
          }))
        }).catch(err => {
          toast('Failed to load campaign leads', 'error')
          setActiveCampaignId(null)
        })
      }
    }
  }, [activeCampaignId, dbCampaigns, toast])

  const activeCampaign = campaigns.find(c => c.id === activeCampaignId) || dbCampaigns.find(c => c.id === activeCampaignId) || null

  const prevIndexRef = useRef(0)

  // Update active campaign helper
  const updateActiveCampaign = (updater) => {
    if (activeCampaign?.isDb) {
      setDbCampaigns(prev => prev.map(c => {
        if (c.id === activeCampaignId) {
          return typeof updater === 'function' ? updater(c) : { ...c, ...updater }
        }
        return c
      }))
    } else {
      setCampaigns(prev => prev.map(c => {
        if (c.id === activeCampaignId) {
          return typeof updater === 'function' ? updater(c) : { ...c, ...updater }
        }
        return c
      }))
    }
  }

  // Delete Campaign helper
  const deleteCampaign = async (id, e) => {
    if (e) e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this campaign? All dialer progress and history will be lost.')) {
      if (id.toString().startsWith('db-')) {
        const dbId = Number(id.replace('db-', ''))
        try {
          await api.delete(endpoints.campaigns.delete(dbId))
          toast('Campaign deleted successfully', 'info')
          loadDbCampaigns()
          if (activeCampaignId === id) {
            setActiveCampaignId(null)
          }
        } catch (err) {
          toast('Failed to delete campaign', 'error')
        }
      } else {
        setCampaigns(prev => prev.filter(c => c.id !== id))
        if (activeCampaignId === id) {
          setActiveCampaignId(null)
        }
        toast('Campaign deleted successfully', 'info')
      }
    }
  }

  // Active Lead Information
  const currentLead = activeCampaign && activeCampaign.leads ? activeCampaign.leads[activeCampaign.currentIndex] || null : null
  const totalLeads = activeCampaign && activeCampaign.leads ? activeCampaign.leads.length : 0
  const progressPercent = activeCampaign && totalLeads > 0 ? Math.round((activeCampaign.currentIndex / totalLeads) * 100) : 0

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

  useEffect(() => {
    localStorage.setItem('rt_autodial_next', autoDialNext)
  }, [autoDialNext])

  // Trigger auto dial next
  useEffect(() => {
    if (activeCampaign && activeCampaign.isActive && autoDialNext && activeCampaign.leads?.length > 0) {
      if (activeCampaign.currentIndex > prevIndexRef.current) {
        const nextLead = activeCampaign.leads?.[activeCampaign.currentIndex]
        if (nextLead) {
          const timer = setTimeout(() => {
            triggerDial(nextLead.phone)
          }, 1000)
          return () => clearTimeout(timer)
        }
      }
    }
    prevIndexRef.current = activeCampaign ? activeCampaign.currentIndex : 0
  }, [activeCampaign?.currentIndex, activeCampaign?.isActive, autoDialNext, activeCampaign?.leads])

  // Split CSV helper
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

    const campaignId = 'camp_' + Date.now()
    const campaignName = fileName.replace(/\.[^/.]+$/, "") // strip extension

    let newCampaign = {
      id: campaignId,
      name: campaignName,
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
      rawRows: [],
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
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

      newCampaign.headers = headers
      newCampaign.rawRows = rawRows
      newCampaign.mapping = mapping
      
      setCampaigns(prev => [...prev, newCampaign])
      setActiveCampaignId(campaignId) // Go straight to column mapping
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

      newCampaign.headers = ['Phone']
      newCampaign.rawRows = rawRows
      newCampaign.mapping = mapping
      newCampaign.leads = leads
      newCampaign.isActive = true // Skip mapping screen

      setCampaigns(prev => [...prev, newCampaign])
      setActiveCampaignId(campaignId) // Go straight to dialer
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
    if (!activeCampaign) return
    const { mapping, rawRows } = activeCampaign
    if (!mapping.phone) {
      toast('You must select a Phone Number column mapping', 'error')
      return
    }

    const leads = rawRows.map(row => {
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

    updateActiveCampaign({
      leads,
      currentIndex: 0,
      history: [],
      isActive: true
    })
    toast(`Campaign started with ${leads.length} leads!`, 'success')
  }

  // Record outcome and go to next
  const recordOutcome = async (outcome, details = '') => {
    if (!activeCampaign || !currentLead) return

    const logEntry = {
      ...currentLead,
      outcome,
      notes: details || currentLead.notes,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
    }

    if (activeCampaign.isDb) {
      try {
        await api.put(endpoints.campaigns.updateLead(currentLead.id), {
          status: 'called',
          outcome: outcome,
          notes: details || currentLead.notes
        })
        loadDbCampaigns()
      } catch (err) {
        toast('Failed to save outcome to database', 'error')
      }
    }

    updateActiveCampaign(prev => {
      const nextIndex = prev.currentIndex + 1
      const isFinished = nextIndex >= prev.leads.length

      return {
        ...prev,
        history: [logEntry, ...prev.history],
        currentIndex: isFinished ? prev.currentIndex : nextIndex,
        isActive: !isFinished
      }
    })

    if (activeCampaign.currentIndex + 1 >= totalLeads) {
      toast('Auto-Dialer Campaign Completed!', 'success')
    } else {
      toast(`Outcome saved: ${outcome}`, 'success')
    }
  }

  // Handle lead skip with DB sync if necessary
  const handleSkip = async () => {
    if (!activeCampaign || !currentLead) return

    if (activeCampaign.isDb) {
      try {
        await api.put(endpoints.campaigns.updateLead(currentLead.id), {
          status: 'skipped'
        })
        loadDbCampaigns()
      } catch (err) {
        console.error(err)
      }
    }

    updateActiveCampaign(p => ({
      ...p,
      currentIndex: Math.min(totalLeads - 1, p.currentIndex + 1)
    }))
  }

  // Conversion Redirect Helpers
  const handleConvert = (route, outcomeLabel) => {
    if (!activeCampaign || !currentLead) return

    const prefillData = {
      businessName: currentLead.businessName,
      ownerName: currentLead.ownerName,
      businessPhone: currentLead.phone,
      businessAddress: currentLead.postcode ? `, ${currentLead.postcode}` : '',
      postcode: currentLead.postcode,
      notes: currentLead.notes,
      utilityType: 'electricity'
    }

    const logEntry = {
      ...currentLead,
      outcome: outcomeLabel,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
    }

    if (activeCampaign.isDb) {
      api.put(endpoints.campaigns.updateLead(currentLead.id), {
        status: 'called',
        outcome: outcomeLabel,
        notes: currentLead.notes
      }).then(() => {
        loadDbCampaigns()
      }).catch(err => {
        console.error(err)
      })
    }

    updateActiveCampaign(prev => {
      const nextIndex = prev.currentIndex + 1
      const isFinished = nextIndex >= prev.leads.length

      return {
        ...prev,
        history: [logEntry, ...prev.history],
        currentIndex: isFinished ? prev.currentIndex : nextIndex,
        isActive: !isFinished
      }
    })

    navigate(route, { state: { prefillData } })
  }

  // Reset/Clear campaign inside mapping
  const cancelMapping = () => {
    if (activeCampaignId) {
      setCampaigns(prev => prev.filter(c => c.id !== activeCampaignId))
      setActiveCampaignId(null)
      toast('Campaign upload cancelled', 'info')
    }
  }

  return (
    <>
      <style>{APP_STYLES}{`
        .ad-hero { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%); border-radius: 20px; padding: 32px 36px; margin-bottom: 28px; position: relative; overflow: hidden; }
        .ad-hero::before { content: ''; position: absolute; top: -40%; right: -15%; width: 300px; height: 300px; background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%); border-radius: 50%; }
        .ad-hero::after { content: ''; position: absolute; bottom: -30%; left: -10%; width: 250px; height: 250px; background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%); border-radius: 50%; }
        .ad-hero h1 { color: #fff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; position: relative; z-index: 1; }
        .ad-hero p { color: rgba(255,255,255,0.75); font-size: 13.5px; margin: 4px 0 0; position: relative; z-index: 1; }
        .ad-stat-row { display: flex; gap: 12px; margin-top: 20px; position: relative; z-index: 1; }
        .ad-stat-pill { background: rgba(255,255,255,0.15); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; padding: 10px 16px; flex: 1; text-align: center; }
        .ad-stat-pill .val { font-size: 20px; font-weight: 800; color: #fff; line-height: 1; }
        .ad-stat-pill .lbl { font-size: 10.5px; color: rgba(255,255,255,0.7); font-weight: 600; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
        .ad-upload { border: 2px dashed #e2e8f0; border-radius: 16px; padding: 28px 24px; text-align: center; cursor: pointer; transition: all 0.25s ease; background: #fafbff; }
        .ad-upload:hover { border-color: #a5b4fc; background: #eef2ff; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,0.08); }
        .ad-upload.drag { border-color: #6366f1; background: #eef2ff; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .ad-section-title { font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .ad-camp-card { background: #fff; border: 1px solid #f1f5f9; border-radius: 16px; padding: 20px; cursor: pointer; transition: all 0.25s ease; position: relative; overflow: hidden; }
        .ad-camp-card:hover { border-color: #c7d2fe; box-shadow: 0 8px 24px rgba(99,102,241,0.1); transform: translateY(-2px); }
        .ad-camp-card .camp-badge { position: absolute; top: 0; right: 0; background: linear-gradient(135deg, #6366f1, #818cf8); color: #fff; font-size: 10px; font-weight: 700; padding: 4px 12px 4px 16px; border-radius: 0 0 0 12px; }
        .ad-progress-bar { width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
        .ad-progress-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
        .ad-progress-fill.assigned { background: linear-gradient(90deg, #6366f1, #a78bfa); }
        .ad-progress-fill.local { background: linear-gradient(90deg, #06b6d4, #22d3ee); }
        .ad-outcome-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
        .ad-outcome-chip { font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 6px; line-height: 1.4; }
        .ad-empty { text-align: center; padding: 40px 20px; border-radius: 16px; background: linear-gradient(135deg, #fafbff 0%, #f8fafc 100%); border: 1px dashed #e2e8f0; }
        .ad-empty-icon { width: 48px; height: 48px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
      `}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Header */}
          {!activeCampaignId ? (
            <div className="ad-hero rt-fade">
              <h1>🎯 Auto-Dialer</h1>
              <p>Manage call campaigns, dial leads via Vonage, and track outcomes in real-time</p>
              <div className="ad-stat-row">
                <div className="ad-stat-pill">
                  <div className="val">{dbCampaigns.length}</div>
                  <div className="lbl">Assigned</div>
                </div>
                <div className="ad-stat-pill">
                  <div className="val">{campaigns.length}</div>
                  <div className="lbl">Local</div>
                </div>
                <div className="ad-stat-pill">
                  <div className="val">{dbCampaigns.reduce((s, c) => s + (c.totalLeads || 0), 0) + campaigns.reduce((s, c) => s + (c.leads?.length || 0), 0)}</div>
                  <div className="lbl">Total Leads</div>
                </div>
                <div className="ad-stat-pill">
                  <div className="val">{dbCampaigns.reduce((s, c) => s + (c.calledLeads || 0), 0) + campaigns.reduce((s, c) => s + (c.currentIndex || 0), 0)}</div>
                  <div className="lbl">Called</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rt-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>🎯 Auto-Dialer</h1>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>Active campaign session</p>
              </div>
              <button onClick={() => setActiveCampaignId(null)} className="rt-btn-primary" style={{ background: '#f1f5f9', color: '#475569', boxShadow: 'none', flex: 'none', padding: '10px 18px', fontSize: '13px' }}>
                <ChevronLeft size={14} /> Back to Dashboard
              </button>
            </div>
          )}

          {/* STAGE 1: CAMPAIGNS DASHBOARD (activeCampaignId is null) */}
          {!activeCampaignId && (
            <div className="rt-fade rt-d1 flex flex-col gap-8">
              
              {/* Upload Card — compact inline */}
              <div 
                className={`ad-upload ${dragActive ? 'drag' : ''}`}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Upload size={20} color="#6366f1" />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Upload CSV or TXT File</p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>Drag & drop or click to browse — spreadsheets with headers or notepad phone lists</p>
                  </div>
                  <button className="rt-btn-primary" style={{ padding: '9px 22px', fontSize: '12.5px', height: 'auto', minHeight: 'unset', flexShrink: 0, borderRadius: '10px' }}>
                    Browse File
                  </button>
                </div>
              </div>

              {/* Campaigns List */}
              <div className="flex flex-col gap-8">
                
                {/* 1. ASSIGNED CAMPAIGNS (DATABASE-DRIVEN) */}
                <div>
                  <div className="ad-section-title">
                    <PhoneCall size={15} /> Assigned by Manager · {dbCampaigns.length}
                  </div>

                  {loadingDb ? (
                    <div className="ad-empty">
                      <div className="ad-empty-icon"><PhoneCall size={20} color="#94a3b8" /></div>
                      <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600, margin: 0 }}>Loading assigned campaigns...</p>
                    </div>
                  ) : dbCampaigns.length === 0 ? (
                    <div className="ad-empty">
                      <div className="ad-empty-icon"><PhoneCall size={20} color="#94a3b8" /></div>
                      <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600, margin: 0 }}>No campaigns assigned yet</p>
                      <p style={{ fontSize: '11.5px', color: '#cbd5e1', margin: '4px 0 0' }}>Your manager will assign call lists here when ready</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {dbCampaigns.map((c) => {
                        const campTotal = c.totalLeads
                        const campCalled = c.calledLeads
                        const campProgress = campTotal > 0 ? Math.round((campCalled / campTotal) * 100) : 0
                        const stats = c.outcomeStats || {}

                        return (
                          <div 
                            key={c.id} 
                            onClick={() => setActiveCampaignId(c.id)}
                            className="ad-camp-card"
                          >
                            {campProgress > 0 && <div className="camp-badge">{campProgress}%</div>}
                            
                            <div className="flex items-center gap-2.5 mb-3">
                              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FileSpreadsheet size={17} color="#6366f1" />
                              </div>
                              <div className="min-w-0">
                                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }} className="truncate capitalize">
                                  {c.name}
                                </h4>
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                                  {new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>
                            </div>

                            {/* Progress */}
                            <div className="mb-1">
                              <div className="flex justify-between items-center text-xs font-semibold mb-1.5" style={{ color: '#64748b' }}>
                                <span>{campCalled} / {campTotal} called</span>
                                <span style={{ color: '#6366f1' }}>{campTotal - campCalled} left</span>
                              </div>
                              <div className="ad-progress-bar">
                                <div className="ad-progress-fill assigned" style={{ width: `${campProgress}%` }} />
                              </div>
                            </div>

                            {/* Outcome chips */}
                            <div className="ad-outcome-row">
                              {(stats.no_answer || 0) > 0 && <span className="ad-outcome-chip" style={{ background: '#f1f5f9', color: '#64748b' }}>📵 {stats.no_answer}</span>}
                              {(stats.not_interested || 0) > 0 && <span className="ad-outcome-chip" style={{ background: '#fef2f2', color: '#dc2626' }}>✋ {stats.not_interested}</span>}
                              {(stats.callback || 0) > 0 && <span className="ad-outcome-chip" style={{ background: '#eef2ff', color: '#4f46e5' }}>📞 {stats.callback}</span>}
                              {(stats.transfer || 0) > 0 && <span className="ad-outcome-chip" style={{ background: '#ecfdf5', color: '#059669' }}>🔄 {stats.transfer}</span>}
                              {(stats.sale || 0) > 0 && <span className="ad-outcome-chip" style={{ background: '#fffbeb', color: '#d97706' }}>💰 {stats.sale}</span>}
                            </div>

                            <div className="flex items-center justify-end pt-3 mt-3 border-t border-slate-100">
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {campCalled > 0 ? 'Continue' : 'Start'} Calling <Play size={12} />
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 2. LOCAL CAMPAIGNS (SELF-UPLOADED) */}
                <div>
                  <div className="ad-section-title">
                    <List size={15} /> Your Local Campaigns · {campaigns.length}
                  </div>

                  {campaigns.length === 0 ? (
                    <div className="ad-empty">
                      <div className="ad-empty-icon"><FileText size={20} color="#94a3b8" /></div>
                      <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600, margin: 0 }}>No local campaigns</p>
                      <p style={{ fontSize: '11.5px', color: '#cbd5e1', margin: '4px 0 0' }}>Upload a CSV or TXT file above to create one</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {campaigns.map((c) => {
                        const campTotal = c.leads ? c.leads.length : 0
                        const campCalled = c.currentIndex
                        const campProgress = campTotal > 0 ? Math.round((campCalled / campTotal) * 100) : 0
                        const isMappingPending = !c.isActive

                        return (
                          <div 
                            key={c.id} 
                            onClick={() => setActiveCampaignId(c.id)}
                            className="ad-camp-card"
                          >
                            {!isMappingPending && campProgress > 0 && <div className="camp-badge" style={{ background: 'linear-gradient(135deg, #06b6d4, #22d3ee)' }}>{campProgress}%</div>}
                            
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <FileSpreadsheet size={17} color="#059669" />
                                </div>
                                <div className="min-w-0">
                                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }} className="truncate capitalize">
                                    {c.name}
                                  </h4>
                                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                                    {c.createdAt || 'Just now'}
                                  </span>
                                </div>
                              </div>
                              <button 
                                onClick={(e) => deleteCampaign(c.id, e)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border-none cursor-pointer"
                                title="Delete Campaign"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {isMappingPending ? (
                              <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 px-2.5 py-1.5 rounded-lg w-fit mb-3">
                                <AlertCircle size={13} /> Column Mapping Required
                              </div>
                            ) : (
                              <div className="mb-1">
                                <div className="flex justify-between items-center text-xs font-semibold mb-1.5" style={{ color: '#64748b' }}>
                                  <span>{campCalled} / {campTotal} called</span>
                                  <span style={{ color: '#06b6d4' }}>{campTotal - campCalled} left</span>
                                </div>
                                <div className="ad-progress-bar">
                                  <div className="ad-progress-fill local" style={{ width: `${campProgress}%` }} />
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-end pt-3 mt-3 border-t border-slate-100">
                              <span style={{ fontSize: '12px', fontWeight: 700, color: isMappingPending ? '#d97706' : '#06b6d4', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {isMappingPending ? 'Configure' : campCalled > 0 ? 'Continue' : 'Start'} {isMappingPending ? <AlertCircle size={12} /> : <Play size={12} />}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* STAGE 2: COLUMN MAPPING (activeCampaignId set, activeCampaign.isActive is false) */}
          {activeCampaign && !activeCampaign.isActive && (
            <div className="rt-fade rt-d1 rt-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <FileSpreadsheet color="#6366f1" size={24} />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Map spreadsheet columns — {activeCampaign.name}</h3>
                  <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0' }}>Select which columns correspond to contact fields. CRM will attempt to auto-detect them.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="rt-label">Phone Number <span className="rt-required">*</span></label>
                  <select 
                    value={activeCampaign.mapping.phone} 
                    onChange={(e) => updateActiveCampaign(p => ({ ...p, mapping: { ...p.mapping, phone: e.target.value } }))}
                    className="rt-input"
                  >
                    <option value="">-- Select Column --</option>
                    {activeCampaign.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="rt-label">Business Name</label>
                  <select 
                    value={activeCampaign.mapping.businessName} 
                    onChange={(e) => updateActiveCampaign(p => ({ ...p, mapping: { ...p.mapping, businessName: e.target.value } }))}
                    className="rt-input"
                  >
                    <option value="">-- None (Auto Label) --</option>
                    {activeCampaign.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="rt-label">Owner / Contact Person</label>
                  <select 
                    value={activeCampaign.mapping.ownerName} 
                    onChange={(e) => updateActiveCampaign(p => ({ ...p, mapping: { ...p.mapping, ownerName: e.target.value } }))}
                    className="rt-input"
                  >
                    <option value="">-- None --</option>
                    {activeCampaign.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="rt-label">Postcode / ZIP</label>
                  <select 
                    value={activeCampaign.mapping.postcode} 
                    onChange={(e) => updateActiveCampaign(p => ({ ...p, mapping: { ...p.mapping, postcode: e.target.value } }))}
                    className="rt-input"
                  >
                    <option value="">-- None --</option>
                    {activeCampaign.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="rt-label">Notes / Additional Info</label>
                  <select 
                    value={activeCampaign.mapping.notes} 
                    onChange={(e) => updateActiveCampaign(p => ({ ...p, mapping: { ...p.mapping, notes: e.target.value } }))}
                    className="rt-input"
                  >
                    <option value="">-- None --</option>
                    {activeCampaign.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={cancelMapping}
                  className="rt-btn-primary" 
                  style={{ background: '#f1f5f9', color: '#475569', boxShadow: 'none' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={startCampaign}
                  className="rt-btn-primary"
                  disabled={!activeCampaign.mapping.phone}
                >
                  <Play size={15} /> Start Call Campaign ({activeCampaign.rawRows.length} Leads)
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: ACTIVE CAMPAIGN DIALER (activeCampaignId set, activeCampaign.isActive is true) */}
          {activeCampaign && activeCampaign.isActive && totalLeads > 0 && (
            <div className="rt-fade grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* LEFT & CENTER PANEL (Active Lead + Call Actions) */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* Progress bar */}
                <div className="rt-card" style={{ padding: '16px 20px' }}>
                  <div className="flex justify-between items-center mb-2.5 text-xs font-bold text-slate-500">
                    <span className="capitalize">{activeCampaign.name} — Progress</span>
                    <span>{activeCampaign.currentIndex + 1} / {totalLeads} LEADS ({progressPercent}%)</span>
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
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoDialNext}
                            onChange={(e) => setAutoDialNext(e.target.checked)}
                            className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                          />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>AUTO-DIAL NEXT</span>
                        </label>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600">
                          PENDING DIAL
                        </span>
                      </div>
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
                        onClick={() => updateActiveCampaign(p => ({ ...p, currentIndex: Math.max(0, p.currentIndex - 1) }))}
                        disabled={activeCampaign.currentIndex === 0}
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft size={16} /> Back
                      </button>
                      <span className="text-xs text-slate-400 font-semibold">LEAD INDEX: {activeCampaign.currentIndex + 1} / {totalLeads}</span>
                      <button 
                        onClick={handleSkip}
                        disabled={activeCampaign.currentIndex === totalLeads - 1}
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
                    <div className="flex gap-3 justify-center">
                      <button onClick={() => updateActiveCampaign(p => ({ ...p, currentIndex: 0, history: [], isActive: true }))} className="rt-btn-primary" style={{ padding: '10px 20px', fontSize: '12.5px', height: 'auto', minHeight: 'unset' }}>
                        Reset Progress
                      </button>
                      <button onClick={() => setActiveCampaignId(null)} className="rt-btn-primary" style={{ background: '#f1f5f9', color: '#475569', boxShadow: 'none', padding: '10px 20px', fontSize: '12.5px', height: 'auto', minHeight: 'unset' }}>
                        Back to Dashboard
                      </button>
                    </div>
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
                    <span className="flex items-center justify-center gap-1.5"><List size={14} /> Dialer Queue ({totalLeads - activeCampaign.currentIndex})</span>
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
                    <span className="flex items-center justify-center gap-1.5"><CheckCircle2 size={14} /> Call History ({(activeCampaign.history || []).length})</span>
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 p-4 scrollbar-thin" style={{ minHeight: '300px', maxHeight: '580px' }}>
                  
                  {/* TAB 1: QUEUE LIST */}
                  {activeTab === 'queue' && (
                    <div className="flex flex-col gap-2.5">
                      {(activeCampaign.leads || []).slice(activeCampaign.currentIndex).map((lead, idx) => {
                        const actualIdx = activeCampaign.currentIndex + idx
                        const isActiveLead = actualIdx === activeCampaign.currentIndex
                        return (
                          <div 
                            key={actualIdx}
                            onClick={() => updateActiveCampaign({ currentIndex: actualIdx })}
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
                      {(activeCampaign.leads || []).slice(activeCampaign.currentIndex).length === 0 && (
                        <p className="text-center text-xs text-slate-400 font-semibold py-8">Queue is empty</p>
                      )}
                    </div>
                  )}

                  {/* TAB 2: HISTORY LIST */}
                  {activeTab === 'history' && (
                    <div className="flex flex-col gap-2.5">
                      {(activeCampaign.history || []).map((log, idx) => {
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
                      {(activeCampaign.history || []).length === 0 && (
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
