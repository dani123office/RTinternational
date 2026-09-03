import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Bot, Mic, MicOff, Volume2, Sparkles, Send, RefreshCw,
  Sliders, Settings2, Headphones, Zap, Play, Square, FastForward,
  CheckCircle2, ArrowRight, PhoneForwarded, Calendar, AlertTriangle
} from 'lucide-react'
import api, { endpoints } from '@/lib/api'
import { useToast } from '@/components/ui/toastContext'

const AURA_VOICES = [
  { id: 'aura-angus-en', name: 'Angus (British Male)', desc: 'Professional, assertive UK broker tone' },
  { id: 'aura-luna-en', name: 'Luna (British Female)', desc: 'Warm, articulate UK business consultant' },
  { id: 'aura-asteria-en', name: 'Asteria (US Female)', desc: 'Energetic, confident specialist' },
  { id: 'aura-zeus-en', name: 'Zeus (US Male)', desc: 'Authoritative, clear executive voice' },
]

export default function AiVoiceAgentPanel({
  currentLead,
  onSaveOutcome,
  onNextLead,
  autoPilotEnabled,
  setAutoPilotEnabled,
  triggerDial
}) {
  const { toast } = useToast()
  
  // Voice Agent State
  const [voiceModel, setVoiceModel] = useState('aura-angus-en')
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  // Conversation History
  const [messages, setMessages] = useState([])
  const [userInput, setUserInput] = useState('')
  const [lastAction, setLastAction] = useState(null)
  const [countdown, setCountdown] = useState(null)
  
  // Speech & Audio Refs
  const recognitionRef = useRef(null)
  const audioPlayerRef = useRef(null)
  const chatScrollRef = useRef(null)
  const countdownTimerRef = useRef(null)

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages, isThinking, isSpeaking])

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch (e) {}
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
    }
  }, [])

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      rec.continuous = true
      rec.interimResults = false
      rec.lang = 'en-GB'

      rec.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1]
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript.trim()
          if (transcript) {
            handleCustomerReply(transcript)
          }
        }
      }

      rec.onerror = (event) => {
        console.warn('Speech recognition error:', event.error)
        if (event.error === 'not-allowed') {
          setIsListening(false)
          toast('Microphone access denied. You can still type customer replies.', 'warning')
        }
      }

      rec.onend = () => {
        if (isListening && isSessionActive) {
          try { rec.start() } catch (e) {}
        }
      }

      recognitionRef.current = rec
    }
  }, [isListening, isSessionActive])

  // Play synthesized audio via Deepgram TTS
  const playTTS = async (text) => {
    if (!text) return
    setIsSpeaking(true)
    try {
      const res = await api.post(
        endpoints.aiVoice.tts,
        { text, voice: voiceModel },
        { responseType: 'blob' }
      )
      const audioUrl = URL.createObjectURL(res.data)
      const audio = new Audio(audioUrl)
      audioPlayerRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }
      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
    } catch (err) {
      console.error('Failed to play TTS audio:', err)
      setIsSpeaking(false)
    }
  }

  // Handle AI Conversation Step
  const handleCustomerReply = async (customerText) => {
    if (!customerText || isThinking) return

    const newCustMsg = {
      role: 'user',
      content: customerText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const updatedMessages = [...messages, newCustMsg]
    setMessages(updatedMessages)
    setUserInput('')
    setIsThinking(true)

    try {
      const leadPayload = currentLead ? {
        businessName: currentLead.businessName,
        ownerName: currentLead.ownerName,
        phone: currentLead.phone,
        postcode: currentLead.postcode,
        notes: currentLead.notes
      } : null

      const res = await api.post(endpoints.aiVoice.converse, {
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        leadInfo: leadPayload
      })

      const replyText = res.data.replyText || ''
      const toolCall = res.data.toolCall

      const aiMsg = {
        role: 'assistant',
        content: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tool: toolCall ? toolCall.name : null
      }

      setMessages(prev => [...prev, aiMsg])
      setIsThinking(false)

      // 1. Play Voice
      if (replyText) {
        playTTS(replyText)
      }

      // 2. Process CRM Tool Actions
      if (toolCall) {
        handleToolExecution(toolCall)
      }

    } catch (err) {
      setIsThinking(false)
      console.error(err)
      toast(err.response?.data?.detail || 'AI failed to process message', 'error')
    }
  }

  // Execute Tool Action on CRM
  const handleToolExecution = async (toolCall) => {
    const { name, args } = toolCall
    let actionType = ''
    let outcomeLabel = ''

    if (name === 'book_callback') {
      actionType = 'callback'
      outcomeLabel = 'Callback Scheduled'
      setLastAction({
        type: 'callback',
        title: 'Callback Booked',
        desc: `Scheduled for ${args.scheduled_date || 'soon'} at ${args.scheduled_time || '14:00'}`
      })
    } else if (name === 'register_sale') {
      actionType = 'sale'
      outcomeLabel = 'Sale Created'
      setLastAction({
        type: 'sale',
        title: 'Sale Registered!',
        desc: `Switch agreed for ${args.business_name || currentLead?.businessName || 'Customer'}`
      })
    } else if (name === 'transfer_to_agent') {
      actionType = 'transfer'
      outcomeLabel = 'Live Transfer'
      setLastAction({
        type: 'transfer',
        title: 'Live Transfer Triggered',
        desc: `${args.reason || 'Customer requested senior specialist'}`
      })
    } else if (name === 'mark_not_interested') {
      outcomeLabel = 'Not Interested'
      setLastAction({
        type: 'rejected',
        title: 'Customer Declined',
        desc: args.reason || 'Not interested in renewal'
      })
    }

    if (actionType) {
      try {
        const fullPayload = {
          ...args,
          phone: args.phone || currentLead?.phone,
          business_name: args.business_name || currentLead?.businessName,
          postcode: args.postcode || currentLead?.postcode,
        }
        await api.post(endpoints.aiVoice.autoAction, {
          actionType,
          payload: fullPayload,
          campaignLeadId: currentLead?.id
        })
        toast(`Action executed: ${actionType.toUpperCase()} created in CRM!`, 'success')
      } catch (err) {
        console.error('Auto action failed:', err)
      }
    }

    // Save outcome in campaign history
    if (onSaveOutcome && outcomeLabel) {
      onSaveOutcome(outcomeLabel, JSON.stringify(args))
    }

    // Auto-advance if Auto-Pilot is enabled
    if (autoPilotEnabled) {
      startAutoAdvanceCountdown()
    }
  }

  // Auto-Advance countdown
  const startAutoAdvanceCountdown = () => {
    let timeLeft = 4
    setCountdown(timeLeft)
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)

    countdownTimerRef.current = setInterval(() => {
      timeLeft -= 1
      setCountdown(timeLeft)
      if (timeLeft <= 0) {
        clearInterval(countdownTimerRef.current)
        setCountdown(null)
        stopSession()
        if (onNextLead) {
          onNextLead()
          setTimeout(() => startSession(), 1000)
        }
      }
    }, 1000)
  }

  // Start new AI Call Session
  const startSession = () => {
    if (!currentLead) {
      toast('Please select or upload a campaign lead first', 'warning')
      return
    }

    // Dial the number
    if (triggerDial && currentLead.phone) {
      triggerDial(currentLead.phone)
    }

    setIsSessionActive(true)
    setLastAction(null)
    setCountdown(null)

    // Initial greeting pitch
    const greetingText = `Hi, my name is Alex from RT International regarding the commercial energy renewal for ${currentLead.businessName || 'your business'}. Am I speaking with the decision maker?`
    
    const initialMsg = {
      role: 'assistant',
      content: greetingText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages([initialMsg])
    playTTS(greetingText)

    // Start listening
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (e) {}
    }
  }

  // Stop Session
  const stopSession = () => {
    setIsSessionActive(false)
    setIsListening(false)
    setIsSpeaking(false)
    setIsThinking(false)
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (e) {}
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      setCountdown(null)
    }
  }

  // Toggle Microphone listener
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch (e) {}
      }
      setIsListening(false)
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start()
          setIsListening(true)
          toast('Listening for customer speech...', 'info')
        } catch (e) {}
      } else {
        toast('Speech recognition not supported in this browser. You can type replies.', 'warning')
      }
    }
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* TOP AGENT CONTROL BAR */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSessionActive ? 'bg-indigo-500 shadow-lg shadow-indigo-500/50' : 'bg-white/10'}`}>
              <Bot size={22} className="text-white" />
            </div>
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">AI Voice Agent</h3>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isSpeaking ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                isThinking ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                isListening ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                'bg-white/10 text-white/60'
              }`}>
                {isSpeaking ? 'AI Speaking...' : isThinking ? 'AI Thinking...' : isListening ? 'Listening...' : isSessionActive ? 'In Call' : 'Idle'}
              </span>
            </div>
            <p className="text-[11px] text-white/60 truncate max-w-[280px]">
              {currentLead ? `Target: ${currentLead.businessName} (${currentLead.phone})` : 'Select a lead to start'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoPilotEnabled(!autoPilotEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              autoPilotEnabled
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
            }`}
            title="Automatically advance and dial next lead on call outcome"
          >
            <Zap size={13} className={autoPilotEnabled ? 'text-emerald-400 fill-emerald-400' : ''} />
            Auto-Pilot: {autoPilotEnabled ? 'ON' : 'OFF'}
          </button>

          {isSessionActive ? (
            <button
              onClick={stopSession}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all cursor-pointer border-0"
            >
              <Square size={13} /> Hang Up
            </button>
          ) : (
            <button
              onClick={startSession}
              disabled={!currentLead}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/25 transition-all cursor-pointer border-0 disabled:opacity-40"
            >
              <Play size={13} /> Start AI Call
            </button>
          )}
        </div>
      </div>

      {/* ACTION BANNER (When Tool Action Occurred) */}
      {lastAction && (
        <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 animate-fade-in ${
          lastAction.type === 'sale' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
          lastAction.type === 'callback' ? 'bg-indigo-50 border-indigo-200 text-indigo-900' :
          lastAction.type === 'transfer' ? 'bg-amber-50 border-amber-200 text-amber-900' :
          'bg-slate-50 border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center">
              {lastAction.type === 'sale' ? <Sparkles size={14} className="text-emerald-600" /> :
               lastAction.type === 'callback' ? <Calendar size={14} className="text-indigo-600" /> :
               lastAction.type === 'transfer' ? <PhoneForwarded size={14} className="text-amber-600" /> :
               <AlertTriangle size={14} className="text-slate-600" />}
            </div>
            <div>
              <p className="text-xs font-bold">{lastAction.title}</p>
              <p className="text-[11px] opacity-80">{lastAction.desc}</p>
            </div>
          </div>
          {countdown !== null && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-indigo-600 bg-white px-2 py-0.5 rounded-full shadow-sm">
                Next Lead in {countdown}s
              </span>
              <button
                onClick={() => {
                  if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
                  setCountdown(null)
                  stopSession()
                  if (onNextLead) onNextLead()
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 bg-transparent border-0 cursor-pointer"
              >
                Skip Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* CHAT TRANSCRIPT & TELEPROMPTER */}
      <div 
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2.5 max-h-[380px] min-h-[220px]"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-2.5">
              <Bot size={22} className="text-indigo-600" />
            </div>
            <p className="text-xs font-bold text-slate-700">AI Voice Teleprompter Ready</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[260px]">
              Click &quot;Start AI Call&quot; to dial {currentLead?.businessName || 'the lead'} and initiate autonomous voice pitch.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isAi = m.role === 'assistant'
            return (
              <div
                key={idx}
                className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-bold text-slate-400">
                    {isAi ? '🤖 AI Specialist (Alex)' : `👤 Customer (${currentLead?.businessName || 'Target'})`}
                  </span>
                  <span className="text-[9px] text-slate-400">{m.time}</span>
                </div>
                <div
                  className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed shadow-sm ${
                    isAi
                      ? 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-none font-medium'
                      : 'bg-indigo-600 text-white rounded-tr-none font-medium'
                  }`}
                >
                  <p className="m-0">{m.content}</p>
                  {m.tool && (
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-indigo-600 font-bold">
                      <Zap size={11} /> Triggered Action: {m.tool}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}

        {isThinking && (
          <div className="flex items-center gap-2 p-2 text-xs text-slate-400 font-medium italic">
            <Bot size={14} className="animate-spin text-indigo-500" /> AI is evaluating response...
          </div>
        )}
      </div>

      {/* QUICK SIMULATION / CUSTOMER REPLY PROMPTS */}
      {isSessionActive && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Quick Customer Reply:</span>
          {[
            'How much can you save us?',
            'We are with British Gas',
            'Call me back tomorrow at 3 PM',
            'I am in a contract until 2027',
            'Not interested, thank you',
          ].map((chip, i) => (
            <button
              key={i}
              onClick={() => handleCustomerReply(chip)}
              className="text-[10.5px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-all shrink-0 cursor-pointer"
            >
              &quot;{chip}&quot;
            </button>
          ))}
        </div>
      )}

      {/* INPUT & MICROPHONE DUAL CONTROL */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleListening}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
            isListening
              ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse'
              : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
          }`}
          title={isListening ? 'Microphone Active (Listening)' : 'Turn On Mic Listening'}
        >
          {isListening ? <Mic size={16} /> : <MicOff size={16} />}
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleCustomerReply(userInput)
          }}
          className="flex-1 flex items-center gap-1.5"
        >
          <input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={isListening ? 'Listening to mic/customer... or type reply' : 'Type customer response and press enter...'}
            className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:border-indigo-500 transition-all"
            disabled={!isSessionActive}
          />
          <button
            type="submit"
            disabled={!isSessionActive || !userInput.trim() || isThinking}
            className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-all border-0 cursor-pointer shrink-0"
          >
            <Send size={14} />
          </button>
        </form>

        {/* Voice Selector */}
        <select
          value={voiceModel}
          onChange={(e) => setVoiceModel(e.target.value)}
          className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 outline-none cursor-pointer max-w-[150px] shrink-0"
          title="Select Deepgram Aura Voice"
        >
          {AURA_VOICES.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
