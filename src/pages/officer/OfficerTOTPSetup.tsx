import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'

function MSIcon({ name, size = 20, color, fill = 0 }: { name: string; size?: number; color?: string; fill?: number }) {
    return (
        <span className="material-symbols-outlined"
              style={{ fontSize: size, color, lineHeight: 1, fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 24`, verticalAlign: 'middle' }}>
            {name}
        </span>
    )
}

export default function OfficerTOTPSetup() {
    const navigate = useNavigate()
    const [qrCode, setQrCode]       = useState('')
    const [secret, setSecret]       = useState('')
    const [factorId, setFactorId]   = useState('')
    const [otp, setOtp]             = useState('')
    const [loading, setLoading]     = useState(true)
    const [verifying, setVerifying] = useState(false)
    const [error, setError]         = useState('')
    const [step, setStep]           = useState<'scan' | 'verify' | 'done'>('scan')

    const officerEmail = localStorage.getItem('officer_email') || 'Officer'

    useEffect(() => {
        const link = document.createElement('link')
        link.rel  = 'stylesheet'
        link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
        document.head.appendChild(link)

        const token = localStorage.getItem('officer_token')
        if (!token) { navigate('/officer/login'); return }

        const params   = new URLSearchParams(window.location.search)
        const forceNew = params.get('reset') === 'true' ||
            localStorage.getItem('officer_totp_reset') === 'true'
        localStorage.removeItem('officer_totp_reset')
        void enrollTOTP(forceNew)
    }, [])

    const enrollTOTP = async (forceNew = false) => {
        setLoading(true); setError('')
        try {
            const { data: factorsData } = await supabase.auth.mfa.listFactors()
            const allFactors = factorsData?.totp || []

            if (!forceNew) {
                for (const factor of allFactors) {
                    if ((factor.status as string) === 'unverified') {
                        try { await supabase.auth.mfa.unenroll({ factorId: factor.id }) } catch {}
                    }
                }
                const verified = allFactors.find(f => (f.status as string) === 'verified')
                if (verified) {
                    await new Promise(r => setTimeout(r, 100000))
                    navigate('/officer/verify-2fa')
                    return
                }
            }

            if (forceNew) await new Promise(r => setTimeout(r, 800))

            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                issuer: 'Nexus — Officer Portal',
                friendlyName: `Officer: ${officerEmail}`
            })
            if (error) throw error

            setFactorId(data.id)
            setQrCode(data.totp.qr_code)
            setSecret(data.totp.secret)

        } catch (err: any) {
            const msg = err.message || ''
            if (msg.toLowerCase().includes('already exists') ||
                msg.toLowerCase().includes('already enrolled')) {
                await new Promise(r => setTimeout(r, 1500))
                try {
                    const { data, error } = await supabase.auth.mfa.enroll({
                        factorType: 'totp',
                        issuer: 'Nexus — Officer Portal',
                        friendlyName: `Officer: ${officerEmail}`
                    })
                    if (error) throw error
                    setFactorId(data.id)
                    setQrCode(data.totp.qr_code)
                    setSecret(data.totp.secret)
                } catch {
                    navigate('/officer/verify-2fa')
                }
                return
            }
            setError(msg || 'Failed to initialize 2FA setup')
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async () => {
        if (otp.length !== 6) { setError('Please enter the complete 6-digit code'); return }
        setVerifying(true); setError('')
        try {
            const { data: challenge, error: challengeError } =
                await supabase.auth.mfa.challenge({ factorId })
            if (challengeError) throw challengeError

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId, challengeId: challenge.id, code: otp
            })
            if (verifyError) {
                setError('Invalid code. Please check your authenticator app and try again.')
                setOtp(''); setVerifying(false); return
            }

            localStorage.setItem('officer_totp_verified', 'true')
            setStep('done')
            setTimeout(() => navigate('/officer/dashboard'), 2500)
        } catch (err: any) {
            setError(err.message || 'Verification failed')
            setVerifying(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f7f9fb', fontFamily: 'Public Sans, Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
            <style>{`
                .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; vertical-align:middle; }
                @keyframes spin  { to { transform: rotate(360deg) } }
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
            `}</style>

            {/* Header */}
            <header style={{ position:'fixed', top:0, width:'100%', zIndex:50, background:'rgba(255,255,255,0.9)', backdropFilter:'blur(16px)', borderBottom:'1px solid #e0e3e5', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <MSIcon name="shield_lock" size={20} color="#001736" fill={1}/>
                        <span style={{ fontWeight:900, fontSize:16, color:'#001736', letterSpacing:'-0.3px' }}>Nexus Officer Portal</span>
                    </div>
                    <span style={{ fontSize:12, color:'#747780', fontWeight:500 }}>Security Portal</span>
                </div>
            </header>

            <main style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'80px 24px 40px', gap:24, flexWrap:'wrap' }}>

                {/* Left card */}
                <div style={{ width:'100%', maxWidth:440, background:'white', borderRadius:14, border:'1px solid #e0e3e5', boxShadow:'0 8px 32px rgba(0,0,0,0.07)', overflow:'hidden' }}>
                    <div style={{ height:4, background:'linear-gradient(90deg,#001736,#0060ac)' }}/>
                    <div style={{ padding:'36px 40px' }}>

                        {/* Brand */}
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
                            <div style={{ width:32, height:32, background:'#001736', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                    <rect x="2" y="2" width="7" height="7" rx="1.5" fill="white"/>
                                    <rect x="11" y="2" width="7" height="7" rx="1.5" fill="white" opacity="0.5"/>
                                    <rect x="2" y="11" width="7" height="7" rx="1.5" fill="white" opacity="0.5"/>
                                    <rect x="11" y="11" width="7" height="7" rx="1.5" fill="white"/>
                                </svg>
                            </div>
                            <div>
                                <p style={{ fontWeight:900, fontSize:16, color:'#001736', margin:0 }}>Nexus</p>
                                <span style={{ fontSize:11, fontWeight:700, background:'#eef4ff', color:'#0060ac', padding:'2px 8px', borderRadius:100 }}>Officer 2FA Setup</span>
                            </div>
                        </div>

                        {/* SCAN */}
                        {step === 'scan' && (
                            <>
                                <div style={{ textAlign:'center', marginBottom:24 }}>
                                    <div style={{ width:56, height:56, borderRadius:'50%', background:'#f2f4f6', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                                        <MSIcon name="passkey" size={28} color="#0060ac" fill={1}/>
                                    </div>
                                    <h1 style={{ fontWeight:900, fontSize:22, color:'#001736', letterSpacing:'-0.5px', marginBottom:8 }}>Secure Your Account</h1>
                                    <p style={{ fontSize:14, color:'#43474f', lineHeight:1.65 }}>
                                        As a loan officer you have access to sensitive financial data.
                                        Two-factor authentication is <strong style={{ color:'#001736' }}>mandatory</strong>.
                                    </p>
                                </div>

                                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
                                    {[
                                        { num:'1', icon:'smartphone',      text:'Download Google Authenticator or Authy on your phone' },
                                        { num:'2', icon:'add_circle',      text:'Open the app and tap "Add Account" or "+"' },
                                        { num:'3', icon:'qr_code_scanner', text:'Scan the QR code shown on this page' },
                                    ].map(s => (
                                        <div key={s.num} style={{ display:'flex', alignItems:'center', gap:12, background:'#f7f9fb', borderRadius:10, padding:'12px 14px', border:'1px solid #e0e3e5' }}>
                                            <div style={{ width:28, height:28, background:'#001736', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:12, flexShrink:0 }}>{s.num}</div>
                                            <MSIcon name={s.icon} size={18} color="#0060ac"/>
                                            <p style={{ fontSize:13, color:'#43474f', margin:0 }}>{s.text}</p>
                                        </div>
                                    ))}
                                </div>

                                {error && (
                                    <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, display:'flex', gap:8, alignItems:'center' }}>
                                        <MSIcon name="warning" size={14} color="#dc2626"/> {error}
                                    </div>
                                )}

                                <button onClick={() => setStep('verify')} disabled={loading}
                                        style={{ width:'100%', padding:'13px', background:'#001736', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:15, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.2s' }}
                                        onMouseEnter={e => !loading && (e.currentTarget.style.background='#002b5b')}
                                        onMouseLeave={e => (e.currentTarget.style.background='#001736')}>
                                    {loading ? <><Spinner/> Loading QR Code…</> : <>I've Scanned the QR Code <MSIcon name="arrow_forward" size={16} color="white"/></>}
                                </button>
                            </>
                        )}

                        {/* VERIFY */}
                        {step === 'verify' && (
                            <>
                                <button onClick={() => setStep('scan')}
                                        style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:'#0060ac', marginBottom:20, padding:0 }}>
                                    <MSIcon name="arrow_back" size={16} color="#0060ac"/> Back to QR Code
                                </button>

                                <div style={{ textAlign:'center', marginBottom:24 }}>
                                    <div style={{ width:56, height:56, borderRadius:'50%', background:'#f2f4f6', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                                        <MSIcon name="pin" size={28} color="#0060ac" fill={1}/>
                                    </div>
                                    <h1 style={{ fontWeight:900, fontSize:22, color:'#001736', letterSpacing:'-0.5px', marginBottom:8 }}>Enter Verification Code</h1>
                                    <p style={{ fontSize:14, color:'#43474f' }}>
                                        Open your authenticator app and enter the <strong style={{ color:'#001736' }}>6-digit code</strong> for Nexus
                                    </p>
                                </div>

                                {error && (
                                    <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, display:'flex', gap:8, alignItems:'center' }}>
                                        <MSIcon name="warning" size={14} color="#dc2626"/> {error}
                                    </div>
                                )}

                                {/* OTP Input */}
                                <div style={{ marginBottom:20 }}>
                                    <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#43474f', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
                                        Authenticator Code
                                    </label>
                                    <div style={{ position:'relative' }}>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            value={otp}
                                            onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                                            onKeyDown={e => e.key==='Enter' && handleVerify()}
                                            autoFocus
                                            style={{
                                                width:'100%',
                                                height:72,
                                                textAlign:'center',
                                                fontSize:32,
                                                fontWeight:900,
                                                letterSpacing:'12px',
                                                fontFamily:'monospace',
                                                color:'#001736',
                                                background:'#f2f4f6',
                                                border:'2px solid #e0e3e5',
                                                borderRadius:12,
                                                outline:'none',
                                                boxSizing:'border-box',
                                                paddingLeft:12,
                                                transition:'all 0.2s',
                                                caretColor:'#0060ac',
                                            }}
                                            onFocus={e => {
                                                e.target.style.background = 'white'
                                                e.target.style.borderColor = '#0060ac'
                                                e.target.style.boxShadow = '0 0 0 3px rgba(0,96,172,0.12)'
                                            }}
                                            onBlur={e => {
                                                e.target.style.background = '#f2f4f6'
                                                e.target.style.borderColor = '#e0e3e5'
                                                e.target.style.boxShadow = 'none'
                                            }}
                                        />
                                        <div style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', display:'flex', gap:4 }}>
                                            {[0,1,2,3,4,5].map(i => (
                                                <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:otp[i]?'#0060ac':'#e0e3e5', transition:'background 0.15s' }}/>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:10 }}>
                                        <MSIcon name="schedule" size={13} color="#43474f"/>
                                        <span style={{ fontSize:10, fontWeight:700, color:'#43474f', textTransform:'uppercase', letterSpacing:'0.1em' }}>Refreshes every 30 seconds</span>
                                    </div>
                                </div>

                                <button onClick={handleVerify} disabled={verifying || otp.length !== 6}
                                        style={{ width:'100%', padding:'13px', background:otp.length===6?'#001736':'#e0e3e5', color:otp.length===6?'white':'#747780', border:'none', borderRadius:8, fontWeight:700, fontSize:15, cursor:verifying||otp.length!==6?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.2s' }}
                                        onMouseEnter={e => otp.length===6 && !verifying && (e.currentTarget.style.background='#002b5b')}
                                        onMouseLeave={e => (e.currentTarget.style.background=otp.length===6?'#001736':'#e0e3e5')}>
                                    {verifying ? <><Spinner/> Verifying…</> : <><MSIcon name="lock_open" size={16} color={otp.length===6?'white':'#747780'}/> Activate 2FA &amp; Enter Dashboard</>}
                                </button>
                            </>
                        )}

                        {/* DONE */}
                        {step === 'done' && (
                            <div style={{ textAlign:'center', padding:'16px 0' }}>
                                <div style={{ width:72, height:72, background:'#f0fdf4', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
                                    <MSIcon name="check_circle" size={40} color="#16a34a" fill={1}/>
                                </div>
                                <h2 style={{ fontWeight:900, fontSize:24, color:'#001736', marginBottom:8, letterSpacing:'-0.5px' }}>2FA Activated!</h2>
                                <p style={{ fontSize:14, color:'#43474f', marginBottom:16 }}>Your officer account is now fully secured.</p>
                                <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'12px 16px', marginBottom:16 }}>
                                    <p style={{ fontSize:13, color:'#15803d', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                        <MSIcon name="verified_user" size={14} color="#15803d" fill={1}/>
                                        Every login will now require your authenticator code
                                    </p>
                                </div>
                                <p style={{ fontSize:13, color:'#0060ac', fontWeight:600, animation:'pulse 2s infinite' }}>
                                    Redirecting to dashboard…
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right QR panel */}
                <div style={{ width:'100%', maxWidth:380, background:'linear-gradient(135deg,#001736 0%,#002b5b 60%,#0060ac 100%)', borderRadius:14, minHeight:520, display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'rgba(0,96,172,0.3)', filter:'blur(60px)', top:-40, right:-40 }}/>
                    <div style={{ position:'absolute', width:150, height:150, borderRadius:'50%', background:'rgba(0,96,172,0.15)', filter:'blur(40px)', bottom:40, left:-30 }}/>

                    <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', height:'100%', padding:'28px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:32, height:32, background:'rgba(255,255,255,0.15)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                                    <rect x="2" y="2" width="7" height="7" rx="1.5" fill="white"/>
                                    <rect x="11" y="2" width="7" height="7" rx="1.5" fill="white" opacity="0.5"/>
                                    <rect x="2" y="11" width="7" height="7" rx="1.5" fill="white" opacity="0.5"/>
                                    <rect x="11" y="11" width="7" height="7" rx="1.5" fill="white"/>
                                </svg>
                            </div>
                            <span style={{ fontWeight:700, fontSize:14, color:'white' }}>Officer Portal</span>
                        </div>

                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:'24px 0' }}>
                            {loading ? (
                                <div style={{ textAlign:'center' }}>
                                    <div style={{ width:40, height:40, border:'3px solid rgba(255,255,255,0.2)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
                                    <p style={{ fontSize:14, color:'rgba(255,255,255,0.7)', fontWeight:600 }}>Generating QR Code…</p>
                                </div>
                            ) : qrCode ? (
                                <>
                                    <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:16, textAlign:'center' }}>
                                        Scan with Authenticator App
                                    </p>
                                    <div style={{ background:'white', padding:16, borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', marginBottom:16 }}>
                                        <img src={qrCode} alt="TOTP QR Code" style={{ width:180, height:180, display:'block' }}/>
                                    </div>
                                    <div style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, padding:'12px 16px', width:'100%', textAlign:'center' }}>
                                        <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Manual Entry Code</p>
                                        <p style={{ fontFamily:'monospace', fontSize:12, color:'white', letterSpacing:'0.1em', wordBreak:'break-all', lineHeight:1.5, margin:0 }}>{secret}</p>
                                    </div>
                                    <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:10, textAlign:'center', lineHeight:1.5 }}>
                                        Can't scan? Enter the code above manually in your authenticator app
                                    </p>
                                </>
                            ) : (
                                <div style={{ textAlign:'center' }}>
                                    <MSIcon name="qr_code" size={40} color="rgba(255,255,255,0.3)"/>
                                    <p style={{ fontSize:14, color:'rgba(255,255,255,0.5)', margin:'12px 0' }}>Failed to generate QR code</p>
                                    <button onClick={() => enrollTOTP(true)}
                                            style={{ background:'rgba(255,255,255,0.15)', color:'white', border:'none', borderRadius:8, padding:'9px 20px', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ display:'flex', gap:16, justifyContent:'center' }}>
                            {[{ icon:'verified_user', label:'SSL Secured' }, { icon:'account_balance', label:'Member FDIC' }].map(b => (
                                <div key={b.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                                    <MSIcon name={b.icon} size={13} color="rgba(255,255,255,0.35)" fill={1}/>
                                    <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{b.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            <footer style={{ textAlign:'center', padding:'16px' }}>
                <p style={{ fontSize:11, color:'#c4c6d0' }}>© 2026 Nexus Financial Technologies. Officer Portal</p>
            </footer>
        </div>
    )
}

function Spinner() {
    return (
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none" style={{ animation:'spin 0.7s linear infinite' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round"/>
        </svg>
    )
}
