import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Loader2, Eye, EyeOff, Mail, Lock,
  AlertCircle, CheckCircle2, XCircle,
  ShieldCheck, Zap, Star, Headphones
} from 'lucide-react';

// ─── Role-based redirect helper ───────────────────────────────────────────────
// Uses the user object returned directly from login() — NOT localStorage.
// localStorage reads after setState can race and return stale data.
function redirectByRole(role: string | undefined, navigate: ReturnType<typeof useNavigate>, from?: string | null) {
  // If redirected here from a protected page, go back there first
  if (from) {
    const destination = typeof from === 'string' ? from : (from as any).pathname || '/';
    navigate(destination, { replace: true });
    return;
  }

  switch (role?.toLowerCase()) {
    case 'admin':  navigate('/admin',         { replace: true }); break;
    case 'driver': navigate('/driver/portal', { replace: true }); break;
    case 'vendor': navigate('/vendors',       { replace: true }); break;
    default:       navigate('/',              { replace: true }); break;
  }
}

export default function Login() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]     = useState(true);
  const [error, setError]               = useState('');
  const [isLoading, setIsLoading]       = useState(false);
  const [touched, setTouched]           = useState<Record<string, boolean>>({});

  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const from    = (location.state as any)?.from || null;
  const message = (location.state as any)?.message || null;

  const touch = (field: string) => setTouched(t => ({ ...t, [field]: true }));

  const emailError    = () => !email ? 'Email is required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Please enter a valid email address' : null;
  const passwordError = () => !password ? 'Password is required' : null;
  const isFormValid   = !emailError() && !passwordError();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isFormValid) return;

    setIsLoading(true);
    setError('');

    try {
      // login() sets both context state AND storage (local/session based on remember).
      // Login writes to storage synchronously so we can read role immediately after.
      await login(email, password, rememberMe);

      // Read role directly from storage right after login sets it.
      const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
      const role   = stored ? JSON.parse(stored)?.role : undefined;

      console.log('[Login] Role detected:', role); // remove after confirming

      redirectByRole(role, navigate, from);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fieldState  = (field: string, err: string | null, value: string) => !touched[field] || !value ? 'idle' : err ? 'error' : 'success';
  const borderColor = (state: string) => state === 'error' ? '#ef4444' : state === 'success' ? '#22c55e' : '#e2e8f0';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        .li-root * { box-sizing: border-box; font-family: 'Sora', sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes shake  { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        @keyframes spin   { to { transform: rotate(360deg) } }
        .fade-up { animation: fadeUp .45s cubic-bezier(.4,0,.2,1) both }
        .shake   { animation: shake .35s ease }
        .li-input {
          width: 100%; padding: 13px 14px 13px 44px;
          border-radius: 12px; border: 1.5px solid #e2e8f0;
          font-size: 14px; color: #0f172a; outline: none;
          background: #f8faff; transition: all .2s;
          font-family: 'Sora', sans-serif;
        }
        .li-input:focus { background: white; box-shadow: 0 0 0 3px rgba(59,130,246,.12); }
        .li-input::placeholder { color: #94a3b8; }
        .btn-signin {
          width: 100%; padding: 14px; border-radius: 13px; border: none;
          background: linear-gradient(135deg, #1d4ed8, #3b82f6);
          color: white; font-size: 15px; font-weight: 700;
          cursor: pointer; font-family: 'Sora', sans-serif;
          transition: all .2s; box-shadow: 0 4px 18px rgba(59,130,246,.35);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-signin:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(59,130,246,.45); }
        .btn-signin:disabled { opacity: .6; cursor: not-allowed; }
        .field-icon  { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; }
        .status-icon { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; }
        .eye-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #94a3b8; padding: 0; display: flex; }
        .eye-btn:hover { color: #475569; }
        .remember-row { display:flex; align-items:center; justify-content:space-between; margin-top:6px; }
        .remember-label { display:flex; align-items:center; gap:8px; font-size:12px; color:#475569; font-weight:600; }
        .remember-box { width:16px; height:16px; accent-color:#2563eb; }
        .trust-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; margin-bottom: 10px; }
      `}</style>

      <div className="li-root min-h-screen flex" style={{ background: 'linear-gradient(135deg,#eff6ff 0%,#f8faff 50%,#faf5ff 100%)' }}>

        {/* ── Left decorative panel ── */}
        <div className="hidden lg:flex lg:w-5/12 flex-col items-center justify-center p-12 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg,#1e3a8a 0%,#1d4ed8 55%,#2563eb 100%)' }}>
          <div style={{ position:'absolute', top:-80, left:-80, width:320, height:320, borderRadius:'50%', background:'rgba(255,255,255,.06)' }} />
          <div style={{ position:'absolute', bottom:-60, right:-60, width:260, height:260, borderRadius:'50%', background:'rgba(255,255,255,.04)' }} />
          <div style={{ position:'absolute', top:'35%', right:-50, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.03)' }} />

          <div className="fade-up relative z-10 w-full" style={{ maxWidth: 340 }}>
            <div style={{ width:72, height:72, borderRadius:20, background:'rgba(255,255,255,.15)', border:'2px solid rgba(255,255,255,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, fontWeight:900, color:'white', margin:'0 auto 28px' }}>
              M
            </div>
            <div style={{ color:'white', fontSize:30, fontWeight:800, lineHeight:1.2, marginBottom:10, textAlign:'center' }}>
              Welcome back to<br />MzuriTech
            </div>
            <div style={{ color:'rgba(255,255,255,.6)', fontSize:14, textAlign:'center', marginBottom:40, lineHeight:1.7 }}>
              Sign in to access your orders, wishlist, rewards points and more.
            </div>
            {[
              { icon:<ShieldCheck size={18} color="#86efac" />, title:'Secure sign-in',        desc:'Your data is encrypted end-to-end' },
              { icon:<Star        size={18} color="#fde68a" />, title:'Your rewards await',    desc:'Check your loyalty points & tier' },
              { icon:<Zap         size={18} color="#a5b4fc" />, title:'Fast checkout',         desc:'Saved addresses & payment methods' },
              { icon:<Headphones  size={18} color="#f9a8d4" />, title:'24/7 customer support', desc:"We're always here to help you" },
            ].map((t, i) => (
              <div key={t.title} className="trust-item fade-up" style={{ animationDelay:`${.1 + i * .08}s` }}>
                <div style={{ width:38, height:38, borderRadius:10, background:'rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {t.icon}
                </div>
                <div>
                  <div style={{ color:'white', fontWeight:600, fontSize:13 }}>{t.title}</div>
                  <div style={{ color:'rgba(255,255,255,.55)', fontSize:12, marginTop:1 }}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right — form panel ── */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="fade-up w-full" style={{ maxWidth: 420 }}>

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-3 mb-8">
              <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:900, fontSize:20 }}>M</div>
              <span style={{ fontSize:20, fontWeight:800, color:'#0f172a' }}>MzuriTech</span>
            </div>

            <div style={{ marginBottom:32 }}>
              <h1 style={{ fontSize:28, fontWeight:800, color:'#0f172a', marginBottom:6 }}>Sign in</h1>
              <p style={{ fontSize:14, color:'#64748b' }}>Enter your email and password to continue</p>
            </div>

            {(message || from) && (
              <div style={{ background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:12, padding:'12px 16px', marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, color:'#1d4ed8', fontSize:13, fontWeight:600, marginBottom: message ? 6 : 0 }}>
                  <CheckCircle2 size={15} style={{ flexShrink:0 }} />
                  {message || 'Sign in to continue'}
                </div>
                {message && (
                  <p style={{ fontSize:12, color:'#3b82f6', marginLeft:25 }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color:'#1d4ed8', fontWeight:700, textDecoration:'underline' }}>
                      Create one free
                    </Link>
                    {' '}— it only takes a minute.
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="shake" style={{ background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, marginBottom:24, color:'#dc2626', fontSize:13 }}>
                <AlertCircle size={16} style={{ flexShrink:0 }} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate style={{ display:'grid', gap:20 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:7, textTransform:'uppercase', letterSpacing:'.06em' }}>
                  Email Address
                </label>
                <div style={{ position:'relative' }}>
                  <span className="field-icon"><Mail size={16} color="#94a3b8" /></span>
                  <input
                    className="li-input" type="email" placeholder="name@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} onBlur={() => touch('email')}
                    style={{ borderColor: borderColor(fieldState('email', emailError(), email)) }}
                    autoComplete="email" autoFocus
                  />
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

              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                  <label style={{ fontSize:12, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.06em' }}>Password</label>
                  <Link to="/forgot-password" style={{ fontSize:12, color:'#1d4ed8', fontWeight:600, textDecoration:'none' }}>Forgot password?</Link>
                </div>
                <div style={{ position:'relative' }}>
                  <span className="field-icon"><Lock size={16} color="#94a3b8" /></span>
                  <input
                    className="li-input" type={showPassword ? 'text' : 'password'} placeholder="Enter your password"
                    value={password} onChange={e => setPassword(e.target.value)} onBlur={() => touch('password')}
                    style={{ paddingRight:44, borderColor: borderColor(fieldState('password', passwordError(), password)) }}
                    autoComplete="current-password"
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPassword(s => !s)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {touched.password && passwordError() && (
                  <p style={{ color:'#ef4444', fontSize:12, marginTop:5, display:'flex', alignItems:'center', gap:5 }}>
                    <XCircle size={12} /> {passwordError()}
                  </p>
                )}
                <div className="remember-row">
                  <label className="remember-label">
                    <input
                      type="checkbox"
                      className="remember-box"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                    />
                    Remember me
                  </label>
                </div>
              </div>

              <button type="submit" className="btn-signin" disabled={isLoading} style={{ marginTop:4 }}>
                {isLoading
                  ? <><Loader2 size={18} style={{ animation:'spin 1s linear infinite' }} /> Signing in…</>
                  : '→  Sign In'}
              </button>

              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
                <span style={{ color:'#94a3b8', fontSize:12 }}>New to MzuriTech?</span>
                <div style={{ flex:1, height:1, background:'#e2e8f0' }} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <Link to="/register"
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'11px', borderRadius:12, border:'1.5px solid #e2e8f0', background:'white', color:'#1d4ed8', fontSize:13, fontWeight:700, textDecoration:'none', transition:'all .2s', gap:6 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='#3b82f6'; (e.currentTarget as HTMLElement).style.background='#eff6ff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='#e2e8f0'; (e.currentTarget as HTMLElement).style.background='white'; }}
                >
                  👤 Customer
                </Link>
                <Link to="/register-vendor"
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'11px', borderRadius:12, border:'1.5px solid #e2e8f0', background:'white', color:'#7c3aed', fontSize:13, fontWeight:700, textDecoration:'none', transition:'all .2s', gap:6 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='#7c3aed'; (e.currentTarget as HTMLElement).style.background='#faf5ff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='#e2e8f0'; (e.currentTarget as HTMLElement).style.background='white'; }}
                >
                  🏪 Vendor
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
