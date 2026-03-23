import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Eye, EyeOff, CheckCircle, XCircle, ShieldCheck, Lock, KeyRound } from 'lucide-react';

const API_URL = 'http://localhost:5000';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);

  const checks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    match:     password === confirm && confirm.length > 0,
  };
  const allValid = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return;
    setError('');
    setIsLoading(true);

    try {
      const res  = await fetch(`${API_URL}/api/auth/reset-password/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        const msg = data.message || 'Reset link is invalid or has expired.';
        if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('expired')) {
          setTokenExpired(true);
        }
        setError(msg);
      }
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left blue panel — identical to ForgotPassword ── */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col justify-center items-center px-12 py-16 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a3faa 0%, #2563eb 60%, #1d4ed8 100%)' }}
      >
        <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full opacity-10 bg-white" />
        <div className="absolute bottom-[-60px] right-[-60px] w-60 h-60 rounded-full opacity-10 bg-white" />

        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold text-xl">M</div>
          <span className="text-2xl font-bold">MzuriTech</span>
        </div>

        <h2 className="text-3xl font-bold text-center mb-3">Create new password</h2>
        <p className="text-blue-200 text-center text-sm mb-10 max-w-xs">
          Choose a strong password to keep your MzuriTech account secure.
        </p>

        <div className="space-y-4 w-full max-w-xs">
          {[
            { icon: <ShieldCheck className="h-5 w-5" />, title: 'Strong Encryption',  desc: 'Your password is hashed & never stored in plain text' },
            { icon: <Lock        className="h-5 w-5" />, title: 'Instant Access',      desc: 'Log in immediately after resetting'                   },
            { icon: <KeyRound    className="h-5 w-5" />, title: 'One-time Link',       desc: 'Reset links expire after 15 minutes for safety'       },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-center gap-4 bg-white/10 rounded-xl px-4 py-3">
              <div className="text-blue-200">{icon}</div>
              <div>
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-blue-200 text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">

          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Sign In
          </Link>

          {/* ── SUCCESS ── */}
          {success && (
            <div className="text-center">
              <div className="mx-auto mb-6 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Password reset!</h1>
              <p className="text-gray-500 text-sm mb-6">
                Your password has been updated successfully.<br />
                You can now sign in with your new password.
              </p>
              <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={() => navigate('/login')}>
                Sign In Now →
              </Button>
            </div>
          )}

          {/* ── EXPIRED TOKEN ── */}
          {!success && tokenExpired && (
            <div className="text-center">
              <div className="mx-auto mb-6 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Link expired</h1>
              <p className="text-gray-500 text-sm mb-2">{error}</p>
              <p className="text-gray-400 text-xs mb-6">Reset links expire after 15 minutes.</p>
              <Link to="/forgot-password">
                <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  Request New Link
                </Button>
              </Link>
            </div>
          )}

          {/* ── FORM ── */}
          {!success && !tokenExpired && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Set new password</h1>
              <p className="text-gray-500 text-sm mb-8">
                Must be at least 8 characters with uppercase and lowercase letters.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <span className="shrink-0">⚠️</span> {error}
                  </div>
                )}

                {/* New password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={`h-12 pr-10 ${password && checks.length && checks.uppercase && checks.lowercase ? 'border-green-400' : password ? 'border-red-300' : 'border-gray-200'} focus:border-blue-500 focus:ring-blue-500`}
                      required
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirm" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      className={`h-12 pr-10 ${confirm && checks.match ? 'border-green-400' : confirm ? 'border-red-300' : 'border-gray-200'} focus:border-blue-500 focus:ring-blue-500`}
                      required
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Strength checklist */}
                {password.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-2 gap-2">
                    {[
                      { key: 'length',    label: 'At least 8 characters' },
                      { key: 'uppercase', label: 'One uppercase letter'   },
                      { key: 'lowercase', label: 'One lowercase letter'   },
                      { key: 'match',     label: 'Passwords match'        },
                    ].map(c => (
                      <div key={c.key} className={`flex items-center gap-2 text-xs font-medium transition-colors ${checks[c.key as keyof typeof checks] ? 'text-green-600' : 'text-gray-400'}`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${checks[c.key as keyof typeof checks] ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {c.label}
                      </div>
                    ))}
                  </div>
                )}

                <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg" disabled={!allValid || isLoading}>
                  {isLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting…</>
                    : '→ Reset Password'
                  }
                </Button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Remember your password?{' '}
                <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
}