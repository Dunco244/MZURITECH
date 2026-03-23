import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Eye, EyeOff, Store, User, Mail, Phone, Lock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function Register() {
  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [phone, setPhone]                     = useState('+254');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [error, setError]                     = useState('');
  const [isLoading, setIsLoading]             = useState(false);
  const [touched, setTouched]                 = useState<Record<string, boolean>>({});

  const { register } = useAuth();
  const navigate = useNavigate();

  const touch = (field: string) => setTouched(t => ({ ...t, [field]: true }));

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

  const pwdChecks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const passwordError = () => {
    if (!password) return 'Password is required';
    if (!Object.values(pwdChecks).every(Boolean)) return 'Password does not meet requirements';
    return null;
  };

  const confirmError = () => {
    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const isFormValid = !nameError() && !emailError() && !phoneError() && !passwordError() && !confirmError();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, password: true, confirmPassword: true });
    if (!isFormValid) return;
    setIsLoading(true);
    setError('');
    try {
      await register(name, email, password, phone);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
        .reg-root * { box-sizing: border-box; font-family: 'Sora', sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes shake  { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        .fade-up  { animation: fadeUp .45s cubic-bezier(.4,0,.2,1) both }
        .shake    { animation: shake .35s ease }
        .reg-input {
          width: 100%; padding: 12px 14px 12px 42px;
          border-radius: 11px; border: 1.5px solid #e2e8f0;
          font-size: 14px; color: #0f172a; outline: none;
          background: #f8faff; transition: all .2s;
          font-family: 'Sora', sans-serif;
        }
        .reg-input:focus { background: white; box-shadow: 0 0 0 3px rgba(59,130,246,.12); }
        .reg-input::placeholder { color: #94a3b8; }
        .check-item { display:flex; align-items:center; gap:6px; font-size:12px; transition:color .2s; }
        .btn-primary-reg {
          width: 100%; padding: 13px; border-radius: 12px; border: none;
          background: linear-gradient(135deg,#1d4ed8,#3b82f6);
          color: white; font-size: 15px; font-weight: 700;
          cursor: pointer; font-family: 'Sora',sans-serif;
          transition: all .2s; box-shadow: 0 4px 18px rgba(59,130,246,.35);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-primary-reg:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 24px rgba(59,130,246,.45); }
        .btn-primary-reg:disabled { opacity:.6; cursor:not-allowed; }
        .btn-vendor {
          width: 100%; padding: 12px; border-radius: 12px;
          border: 1.5px solid #e2e8f0; background: white;
          color: #475569; font-size: 14px; font-weight: 600;
          cursor: pointer; font-family: 'Sora',sans-serif;
          transition: all .2s; display:flex; align-items:center; justify-content:center; gap:8px;
        }
        .btn-vendor:hover { border-color:#3b82f6; color:#1d4ed8; background:#f0f7ff; }
        .field-icon { position:absolute; left:13px; top:50%; transform:translateY(-50%); pointer-events:none; }
        .status-icon { position:absolute; right:13px; top:50%; transform:translateY(-50%); pointer-events:none; }
        .eye-btn { position:absolute; right:13px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#94a3b8; padding:0; display:flex; }
        .eye-btn:hover { color:#475569; }
      `}</style>

      <div className="reg-root min-h-screen flex" style={{ background: 'linear-gradient(135deg,#eff6ff 0%,#f8faff 40%,#faf5ff 100%)' }}>

        {/* Left panel */}
        <div className="hidden lg:flex lg:w-5/12 flex-col items-center justify-center p-12 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg,#1e3a8a 0%,#1d4ed8 55%,#6d28d9 100%)' }}>
          <div style={{ position:'absolute', top:-80, left:-80, width:320, height:320, borderRadius:'50%', background:'rgba(255,255,255,.06)' }} />
          <div style={{ position:'absolute', bottom:-60, right:-60, width:260, height:260, borderRadius:'50%', background:'rgba(255,255,255,.05)' }} />
          <div style={{ position:'absolute', top:'40%', right:-40, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,.04)' }} />

          <div className="fade-up relative z-10 text-center" style={{ animationDelay:'.1s' }}>
            <div style={{ width:72, height:72, borderRadius:20, background:'rgba(255,255,255,.15)', border:'2px solid rgba(255,255,255,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, fontWeight:900, color:'white', margin:'0 auto 28px' }}>M</div>
            <div style={{ color:'white', fontSize:30, fontWeight:800, lineHeight:1.2, marginBottom:14 }}>
              Join MzuriTech<br />Today
            </div>
            <div style={{ color:'rgba(255,255,255,.65)', fontSize:15, lineHeight:1.7, maxWidth:300, margin:'0 auto 40px' }}>
              Shop the latest electronics, earn loyalty points on every purchase, and enjoy exclusive member benefits.
            </div>
            {[
              { icon:'⭐', text:'Earn points on every order' },
              { icon:'🎁', text:'Refer friends, earn bonuses' },
              { icon:'🚚', text:'Free shipping over KES 50,000' },
              { icon:'🔒', text:'Secure & encrypted checkout' },
            ].map((f, i) => (
              <div key={f.text} className="fade-up" style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', borderRadius:12, padding:'11px 16px', marginBottom:10, animationDelay:`${.2+i*.08}s` }}>
                <span style={{ fontSize:18 }}>{f.icon}</span>
                <span style={{ color:'rgba(255,255,255,.85)', fontSize:13, fontWeight:500 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
          <div className="fade-up w-full" style={{ maxWidth: 480 }}>

            <div className="flex lg:hidden items-center gap-3 mb-8">
              <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#1d4ed8,#6d28d9)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:900, fontSize:20 }}>M</div>
              <span style={{ fontSize:20, fontWeight:800, color:'#0f172a' }}>MzuriTech</span>
            </div>

            <div style={{ marginBottom:28 }}>
              <h1 style={{ fontSize:26, fontWeight:800, color:'#0f172a', marginBottom:6 }}>Create your account</h1>
              <p style={{ fontSize:14, color:'#64748b' }}>Fill in the details below to get started</p>
            </div>

            {error && (
              <div className="shake" style={{ background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, marginBottom:20, color:'#dc2626', fontSize:13 }}>
                <AlertCircle size={16} style={{ flexShrink:0 }} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate style={{ display:'grid', gap:18 }}>

              {/* Full Name */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:7, textTransform:'uppercase', letterSpacing:'.06em' }}>Full Name</label>
                <div style={{ position:'relative' }}>
                  <span className="field-icon"><User size={16} color="#94a3b8" /></span>
                  <input className="reg-input" type="text" placeholder="e.g. Jane Doe"
                    value={name} onChange={e => setName(e.target.value)} onBlur={() => touch('name')}
                    style={{ borderColor: borderColor(fieldState('name', nameError(), name)) }}
                    autoComplete="name" />
                  {touched.name && name && (
                    <span className="status-icon">
                      {nameError() ? <XCircle size={16} color="#ef4444" /> : <CheckCircle2 size={16} color="#22c55e" />}
                    </span>
                  )}
                </div>
                {touched.name && nameError() && (
                  <p style={{ color:'#ef4444', fontSize:12, marginTop:5, display:'flex', alignItems:'center', gap:5 }}>
                    <XCircle size={12} /> {nameError()}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:7, textTransform:'uppercase', letterSpacing:'.06em' }}>Email Address</label>
                <div style={{ position:'relative' }}>
                  <span className="field-icon"><Mail size={16} color="#94a3b8" /></span>
                  <input className="reg-input" type="email" placeholder="name@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} onBlur={() => touch('email')}
                    style={{ borderColor: borderColor(fieldState('email', emailError(), email)) }}
                    autoComplete="email" />
                  {touched.email && email && (
                    <span className="status-icon">
                      {emailError() ? <XCircle size={16} color="#ef4444" /> : <CheckCircle2 size={16} color="#22c55e" />}
                    </span>
                  )}
                </div>
                {touched.email && emailError() && (
                  <p style={{ color:'#ef4444', fontSize:12, marginTop:5, display:'flex', alignItems:'center', gap:5 }}>
                    <XCircle size={12} /> {emailError()}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:7, textTransform:'uppercase', letterSpacing:'.06em' }}>
                  Phone *
                </label>
                <div style={{ position:'relative' }}>
                  <span className="field-icon"><Phone size={16} color="#94a3b8" /></span>
                  <input className="reg-input" type="tel" placeholder="+254 700 000 000"
                    value={phone} onChange={e => setPhone(e.target.value)} onBlur={() => touch('phone')}
                    style={{ borderColor: touched.phone && phoneError() ? '#ef4444' : '#e2e8f0' }}
                    autoComplete="tel" />
                </div>
                {touched.phone && phoneError() && (
                  <p style={{ color:'#ef4444', fontSize:12, marginTop:5, display:'flex', alignItems:'center', gap:5 }}>
                    <XCircle size={12} /> {phoneError()}
                  </p>
                )}
                <p style={{ color:'#94a3b8', fontSize:11, marginTop:4 }}>Format: +254 followed by 9 digits</p>
              </div>

              {/* Password */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:7, textTransform:'uppercase', letterSpacing:'.06em' }}>Password</label>
                <div style={{ position:'relative' }}>
                  <span className="field-icon"><Lock size={16} color="#94a3b8" /></span>
                  <input className="reg-input" type={showPassword ? 'text' : 'password'} placeholder="Create a strong password"
                    value={password} onChange={e => setPassword(e.target.value)} onBlur={() => touch('password')}
                    style={{ paddingRight:42, borderColor: touched.password && password ? borderColor(Object.values(pwdChecks).every(Boolean) ? 'success' : 'error') : '#e2e8f0' }}
                    autoComplete="new-password" />
                  <button type="button" className="eye-btn" onClick={() => setShowPassword(s => !s)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password && (
                  <div style={{ marginTop:10, background:'#f8faff', border:'1.5px solid #e8edf5', borderRadius:10, padding:'12px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 16px' }}>
                    {[
                      { key:'length',    label:'8+ characters' },
                      { key:'uppercase', label:'Uppercase letter' },
                      { key:'lowercase', label:'Lowercase letter' },
                      { key:'number',    label:'Number' },
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

              {/* Confirm Password */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:7, textTransform:'uppercase', letterSpacing:'.06em' }}>Confirm Password</label>
                <div style={{ position:'relative' }}>
                  <span className="field-icon"><Lock size={16} color="#94a3b8" /></span>
                  <input className="reg-input" type={showConfirm ? 'text' : 'password'} placeholder="Re-enter your password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onBlur={() => touch('confirmPassword')}
                    style={{ paddingRight:42, borderColor: borderColor(fieldState('confirmPassword', confirmError(), confirmPassword)) }}
                    autoComplete="new-password" />
                  <button type="button" className="eye-btn" onClick={() => setShowConfirm(s => !s)}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {touched.confirmPassword && confirmError() && (
                  <p style={{ color:'#ef4444', fontSize:12, marginTop:5, display:'flex', alignItems:'center', gap:5 }}>
                    <XCircle size={12} /> {confirmError()}
                  </p>
                )}
                {touched.confirmPassword && !confirmError() && confirmPassword && (
                  <p style={{ color:'#16a34a', fontSize:12, marginTop:5, display:'flex', alignItems:'center', gap:5 }}>
                    <CheckCircle2 size={12} /> Passwords match
                  </p>
                )}
              </div>

              <button type="submit" className="btn-primary-reg" disabled={isLoading} style={{ marginTop:4 }}>
                {isLoading
                  ? <><Loader2 size={18} style={{ animation:'spin 1s linear infinite' }} /> Creating account…</>
                  : '🚀 Create Account'}
              </button>

              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
                <span style={{ color:'#94a3b8', fontSize:12 }}>OR</span>
                <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
              </div>

              <button type="button" className="btn-vendor" onClick={() => navigate('/register-vendor')}>
                <Store size={16} /> Register as Vendor
              </button>

              <p style={{ textAlign:'center', fontSize:14, color:'#64748b' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color:'#1d4ed8', fontWeight:700, textDecoration:'none' }}>Sign in →</Link>
              </p>

            </form>
          </div>
        </div>
      </div>
    </>
  );
}

