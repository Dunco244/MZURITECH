import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Loader2, Eye, EyeOff, Store, User, Mail, Phone,
  Lock, CheckCircle2, XCircle, AlertCircle, Building2,
  FileText, TrendingUp, Users, Package, BarChart3
} from 'lucide-react';

export default function RegisterVendor() {
  const [name, setName]                         = useState('');
  const [email, setEmail]                       = useState('');
  const [phone, setPhone]                       = useState('+254');
  const [password, setPassword]                 = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [showPassword, setShowPassword]         = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [businessName, setBusinessName]         = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessPhone, setBusinessPhone]       = useState('+254');
  const [error, setError]                       = useState('');
  const [isLoading, setIsLoading]               = useState(false);
  const [touched, setTouched]                   = useState<Record<string, boolean>>({});

  const { registerAsVendor } = useAuth();
  const navigate = useNavigate();

  const touch = (field: string) => setTouched(t => ({ ...t, [field]: true }));

  // ── Validators ──────────────────────────────────────────────────────────
  const nameError = () => {
    if (!name) return 'Full name is required';
    if (/\d/.test(name)) return 'Name cannot contain numbers';
    if (!/^[a-zA-Z\s'-]+$/.test(name)) return 'Name can only contain letters, spaces, hyphens or apostrophes';
    if (name.trim().length < 3) return 'Name must be at least 3 characters';
    return null;
  };

  const emailError = () => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
    return null;
  };

  const phoneError = () => {
    if (!phone || phone === '+254') return 'Phone number is required';
    if (!/^\+254\d{9}$/.test(phone)) return 'Must start with +254 followed by exactly 9 digits';
    return null;
  };

  const businessPhoneError = () => {
    if (!businessPhone || businessPhone === '+254') return null; // optional
    if (!/^\+254\d{9}$/.test(businessPhone)) return 'Must start with +254 followed by exactly 9 digits';
    return null;
  };

  const businessNameError = () => {
    if (!businessName.trim()) return 'Business name is required';
    if (businessName.trim().length < 2) return 'Business name must be at least 2 characters';
    return null;
  };

  const pwdChecks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const passwordError = () => {
    if (!password) return 'Password is required';
    if (!Object.values(pwdChecks).every(Boolean)) return 'Password does not meet all requirements';
    return null;
  };

  const confirmError = () => {
    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const isFormValid =
    !nameError() && !emailError() && !phoneError() &&
    !businessPhoneError() && !businessNameError() &&
    !passwordError() && !confirmError();

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      name: true, email: true, phone: true, businessPhone: true,
      businessName: true, password: true, confirmPassword: true,
    });
    if (!isFormValid) return;
    setIsLoading(true);
    setError('');
    try {
      await registerAsVendor(
        name, email, password, phone,
        businessName, businessDescription,
        businessPhone || phone
      );
      navigate('/vendors');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vendor registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── UI helpers ───────────────────────────────────────────────────────────
  const fieldState = (field: string, err: string | null, value: string) => {
    if (!touched[field] || !value) return 'idle';
    return err ? 'error' : 'success';
  };
  const borderColor = (state: string) => {
    if (state === 'error')   return '#ef4444';
    if (state === 'success') return '#22c55e';
    return '#e2e8f0';
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .vr-root * { box-sizing: border-box; font-family: 'Sora', sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes shake  { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        .fade-up { animation: fadeUp .45s cubic-bezier(.4,0,.2,1) both }
        .shake   { animation: shake .35s ease }
        .vr-input {
          width: 100%; padding: 11px 14px 11px 42px;
          border-radius: 11px; border: 1.5px solid #e2e8f0;
          font-size: 13.5px; color: #0f172a; outline: none;
          background: #f8faff; transition: all .2s;
          font-family: 'Sora', sans-serif;
        }
        .vr-input:focus { background: white; box-shadow: 0 0 0 3px rgba(59,130,246,.12); }
        .vr-input::placeholder { color: #94a3b8; }
        .vr-textarea {
          width:100%; padding:11px 14px; border-radius:11px;
          border:1.5px solid #e2e8f0; font-size:13.5px; color:#0f172a;
          outline:none; background:#f8faff; transition:all .2s;
          font-family:'Sora',sans-serif; resize:vertical; min-height:90px;
        }
        .vr-textarea:focus { background:white; box-shadow:0 0 0 3px rgba(59,130,246,.12); border-color:#3b82f6; }
        .vr-textarea::placeholder { color:#94a3b8; }
        .btn-submit {
          width:100%; padding:13px; border-radius:12px; border:none;
          background:linear-gradient(135deg,#1d4ed8,#7c3aed);
          color:white; font-size:15px; font-weight:700;
          cursor:pointer; font-family:'Sora',sans-serif;
          transition:all .2s; box-shadow:0 4px 18px rgba(109,40,217,.35);
          display:flex; align-items:center; justify-content:center; gap:8px;
        }
        .btn-submit:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 24px rgba(109,40,217,.45); }
        .btn-submit:disabled { opacity:.6; cursor:not-allowed; }
        .field-icon  { position:absolute; left:13px; top:50%; transform:translateY(-50%); pointer-events:none; }
        .status-icon { position:absolute; right:13px; top:50%; transform:translateY(-50%); pointer-events:none; }
        .eye-btn { position:absolute; right:13px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#94a3b8; padding:0; display:flex; }
        .eye-btn:hover { color:#475569; }
        .check-item { display:flex; align-items:center; gap:6px; font-size:12px; transition:color .2s; }
        .benefit-item { display:flex; align-items:flex-start; gap:12px; padding:12px 14px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12); border-radius:12px; margin-bottom:10px; }
        .section-label { font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.08em; margin-bottom:14px; padding-bottom:8px; border-bottom:1.5px solid #f1f5f9; display:flex; align-items:center; gap:8px; }
      `}</style>

      <div className="vr-root min-h-screen flex" style={{ background: 'linear-gradient(135deg,#f0f7ff 0%,#f8faff 40%,#fdf4ff 100%)' }}>

        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <div className="hidden lg:flex lg:w-5/12 flex-col items-center justify-center p-12 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg,#1e1b4b 0%,#1d4ed8 45%,#7c3aed 100%)' }}>
          <div style={{ position:'absolute', top:-80, left:-80, width:320, height:320, borderRadius:'50%', background:'rgba(255,255,255,.05)' }} />
          <div style={{ position:'absolute', bottom:-60, right:-60, width:260, height:260, borderRadius:'50%', background:'rgba(255,255,255,.04)' }} />

          <div className="fade-up relative z-10 w-full" style={{ maxWidth:340 }}>
            {/* Icon */}
            <div style={{ width:72, height:72, borderRadius:20, background:'rgba(255,255,255,.15)', border:'2px solid rgba(255,255,255,.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
              <Store size={32} color="white" />
            </div>
            <div style={{ color:'white', fontSize:28, fontWeight:800, lineHeight:1.2, marginBottom:8, textAlign:'center' }}>
              Become a Vendor
            </div>
            <div style={{ color:'rgba(255,255,255,.6)', fontSize:14, textAlign:'center', marginBottom:36, lineHeight:1.7 }}>
              Join hundreds of sellers on MzuriTech and grow your business with our platform.
            </div>

            {/* Benefits */}
            {[
              { icon:<Package size={18} color="#a5b4fc" />,   title:'List your products',      desc:'Create unlimited product listings with ease' },
              { icon:<BarChart3 size={18} color="#86efac" />, title:'Real-time analytics',     desc:'Track sales, views and revenue live' },
              { icon:<Users size={18} color="#fde68a" />,     title:'Massive customer base',   desc:'Reach thousands of buyers instantly' },
              { icon:<TrendingUp size={18} color="#f9a8d4" />,title:'Grow your revenue',       desc:'Dedicated vendor dashboard & support' },
            ].map((b, i) => (
              <div key={b.title} className="benefit-item fade-up" style={{ animationDelay:`${.1 + i * .08}s` }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{b.icon}</div>
                <div>
                  <div style={{ color:'white', fontWeight:600, fontSize:13 }}>{b.title}</div>
                  <div style={{ color:'rgba(255,255,255,.55)', fontSize:12, marginTop:2 }}>{b.desc}</div>
                </div>
              </div>
            ))}

            <div style={{ marginTop:20, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
              <CheckCircle2 size={18} color="#86efac" style={{ flexShrink:0 }} />
              <span style={{ color:'rgba(255,255,255,.8)', fontSize:12, lineHeight:1.5 }}>
                Your account will be reviewed and approved by our team within 24 hours.
              </span>
            </div>
          </div>
        </div>

        {/* ── Right — form panel ─────────────────────────────────────────── */}
        <div className="flex-1 flex items-start justify-center p-6 lg:p-10 overflow-y-auto">
          <div className="fade-up w-full" style={{ maxWidth: 540, paddingTop: 20 }}>

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-3 mb-8">
              <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#1d4ed8,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Store size={22} color="white" />
              </div>
              <span style={{ fontSize:20, fontWeight:800, color:'#0f172a' }}>MzuriTech Vendors</span>
            </div>

            <div style={{ marginBottom:28 }}>
              <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', marginBottom:6 }}>Vendor Registration</h1>
              <p style={{ fontSize:14, color:'#64748b' }}>Fill in your personal and business details below</p>
            </div>

            {/* Global error */}
            {error && (
              <div className="shake" style={{ background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, marginBottom:20, color:'#dc2626', fontSize:13 }}>
                <AlertCircle size={16} style={{ flexShrink:0 }} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate style={{ display:'grid', gap:20 }}>

              {/* ── Personal Info ─────────────────────────────────────── */}
              <div>
                <div className="section-label"><User size={13} color="#3b82f6" /> Personal Information</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

                  {/* Name */}
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>Full Name *</label>
                    <div style={{ position:'relative' }}>
                      <span className="field-icon"><User size={15} color="#94a3b8" /></span>
                      <input className="vr-input" type="text" placeholder="Jane Doe"
                        value={name} onChange={e => setName(e.target.value)} onBlur={() => touch('name')}
                        style={{ borderColor: borderColor(fieldState('name', nameError(), name)) }}
                        autoComplete="name" />
                      {touched.name && name && (
                        <span className="status-icon">
                          {nameError() ? <XCircle size={15} color="#ef4444" /> : <CheckCircle2 size={15} color="#22c55e" />}
                        </span>
                      )}
                    </div>
                    {touched.name && nameError() && (
                      <p style={{ color:'#ef4444', fontSize:11, marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                        <XCircle size={11} /> {nameError()}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>Email *</label>
                    <div style={{ position:'relative' }}>
                      <span className="field-icon"><Mail size={15} color="#94a3b8" /></span>
                      <input className="vr-input" type="email" placeholder="name@example.com"
                        value={email} onChange={e => setEmail(e.target.value)} onBlur={() => touch('email')}
                        style={{ borderColor: borderColor(fieldState('email', emailError(), email)) }}
                        autoComplete="email" />
                      {touched.email && email && (
                        <span className="status-icon">
                          {emailError() ? <XCircle size={15} color="#ef4444" /> : <CheckCircle2 size={15} color="#22c55e" />}
                        </span>
                      )}
                    </div>
                    {touched.email && emailError() && (
                      <p style={{ color:'#ef4444', fontSize:11, marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                        <XCircle size={11} /> {emailError()}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>Phone *</label>
                    <div style={{ position:'relative' }}>
                      <span className="field-icon"><Phone size={15} color="#94a3b8" /></span>
                      <input className="vr-input" type="tel" placeholder="+254 700 000 000"
                        value={phone} onChange={e => setPhone(e.target.value)} onBlur={() => touch('phone')}
                        style={{ borderColor: touched.phone && phoneError() ? '#ef4444' : '#e2e8f0' }}
                        autoComplete="tel" />
                    </div>
                    {touched.phone && phoneError() && (
                      <p style={{ color:'#ef4444', fontSize:11, marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                        <XCircle size={11} /> {phoneError()}
                      </p>
                    )}
                  </div>

                  {/* Business Phone */}
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>
                      Business Phone <span style={{ color:'#94a3b8', fontWeight:400, textTransform:'none', fontSize:10 }}>(Optional)</span>
                    </label>
                    <div style={{ position:'relative' }}>
                      <span className="field-icon"><Phone size={15} color="#94a3b8" /></span>
                      <input className="vr-input" type="tel" placeholder="+254 700 000 000"
                        value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} onBlur={() => touch('businessPhone')}
                        style={{ borderColor: touched.businessPhone && businessPhoneError() ? '#ef4444' : '#e2e8f0' }}
                        autoComplete="tel" />
                    </div>
                    {touched.businessPhone && businessPhoneError() && (
                      <p style={{ color:'#ef4444', fontSize:11, marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                        <XCircle size={11} /> {businessPhoneError()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Business Info ─────────────────────────────────────── */}
              <div>
                <div className="section-label"><Building2 size={13} color="#7c3aed" /> Business Information</div>

                {/* Business Name */}
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>Business Name *</label>
                  <div style={{ position:'relative' }}>
                    <span className="field-icon"><Building2 size={15} color="#94a3b8" /></span>
                    <input className="vr-input" type="text" placeholder="Your Store Name"
                      value={businessName} onChange={e => setBusinessName(e.target.value)} onBlur={() => touch('businessName')}
                      style={{ borderColor: borderColor(fieldState('businessName', businessNameError(), businessName)) }} />
                    {touched.businessName && businessName && (
                      <span className="status-icon">
                        {businessNameError() ? <XCircle size={15} color="#ef4444" /> : <CheckCircle2 size={15} color="#22c55e" />}
                      </span>
                    )}
                  </div>
                  {touched.businessName && businessNameError() && (
                    <p style={{ color:'#ef4444', fontSize:11, marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                      <XCircle size={11} /> {businessNameError()}
                    </p>
                  )}
                </div>

                {/* Business Description */}
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>
                    Business Description <span style={{ color:'#94a3b8', fontWeight:400, textTransform:'none', fontSize:10 }}>(Optional)</span>
                  </label>
                  <textarea className="vr-textarea"
                    placeholder="Tell customers about your business, what you sell, your values..."
                    value={businessDescription}
                    onChange={e => setBusinessDescription(e.target.value)}
                  />
                  <p style={{ color:'#94a3b8', fontSize:11, marginTop:4 }}>{businessDescription.length}/500 characters</p>
                </div>
              </div>

              {/* ── Password ──────────────────────────────────────────── */}
              <div>
                <div className="section-label"><Lock size={13} color="#1d4ed8" /> Security</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

                  {/* Password */}
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>Password *</label>
                    <div style={{ position:'relative' }}>
                      <span className="field-icon"><Lock size={15} color="#94a3b8" /></span>
                      <input className="vr-input" type={showPassword ? 'text' : 'password'}
                        placeholder="Create a password"
                        value={password} onChange={e => setPassword(e.target.value)} onBlur={() => touch('password')}
                        style={{ paddingRight:42, borderColor: touched.password && password ? borderColor(Object.values(pwdChecks).every(Boolean) ? 'success' : 'error') : '#e2e8f0' }}
                        autoComplete="new-password" />
                      <button type="button" className="eye-btn" onClick={() => setShowPassword(s => !s)}>
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>Confirm Password *</label>
                    <div style={{ position:'relative' }}>
                      <span className="field-icon"><Lock size={15} color="#94a3b8" /></span>
                      <input className="vr-input" type={showConfirm ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onBlur={() => touch('confirmPassword')}
                        style={{ paddingRight:42, borderColor: borderColor(fieldState('confirmPassword', confirmError(), confirmPassword)) }}
                        autoComplete="new-password" />
                      <button type="button" className="eye-btn" onClick={() => setShowConfirm(s => !s)}>
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {touched.confirmPassword && confirmError() && (
                      <p style={{ color:'#ef4444', fontSize:11, marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                        <XCircle size={11} /> {confirmError()}
                      </p>
                    )}
                    {touched.confirmPassword && !confirmError() && confirmPassword && (
                      <p style={{ color:'#16a34a', fontSize:11, marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                        <CheckCircle2 size={11} /> Passwords match
                      </p>
                    )}
                  </div>
                </div>

                {/* Password checklist */}
                {password && (
                  <div style={{ marginTop:12, background:'#f8faff', border:'1.5px solid #e8edf5', borderRadius:10, padding:'12px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 16px' }}>
                    {[
                      { key:'length',    label:'8+ characters'          },
                      { key:'uppercase', label:'Uppercase letter'        },
                      { key:'lowercase', label:'Lowercase letter'        },
                      { key:'number',    label:'Number'                  },
                      { key:'special',   label:'Special character (!@#)' },
                    ].map(c => (
                      <div key={c.key} className="check-item" style={{ color: pwdChecks[c.key as keyof typeof pwdChecks] ? '#16a34a' : '#94a3b8' }}>
                        {pwdChecks[c.key as keyof typeof pwdChecks]
                          ? <CheckCircle2 size={13} color="#16a34a" />
                          : <div style={{ width:13, height:13, borderRadius:'50%', border:'1.5px solid #cbd5e1', flexShrink:0 }} />}
                        {c.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button type="submit" className="btn-submit" disabled={isLoading} style={{ marginTop:4 }}>
                {isLoading
                  ? <><Loader2 size={18} style={{ animation:'spin 1s linear infinite' }} /> Creating Vendor Account…</>
                  : <><Store size={17} /> Register as Vendor</>}
              </button>

              {/* Links */}
              <div style={{ textAlign:'center', fontSize:13, color:'#64748b' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color:'#1d4ed8', fontWeight:700, textDecoration:'none' }}>Sign in →</Link>
                {'  ·  '}
                <Link to="/register" style={{ color:'#7c3aed', fontWeight:600, textDecoration:'none' }}>Register as Customer</Link>
              </div>

            </form>
          </div>
        </div>
      </div>
    </>
  );
}