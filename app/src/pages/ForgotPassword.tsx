import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, ArrowLeft, CheckCircle, ShieldCheck, Clock, HeadphonesIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email) { setError('Email is required'); setIsLoading(false); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError('Please enter a valid email address'); setIsLoading(false); return; }

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left blue panel ── */}
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

        <h2 className="text-3xl font-bold text-center mb-3">Forgot your password?</h2>
        <p className="text-blue-200 text-center text-sm mb-10 max-w-xs">
          No worries! Enter your email and we'll send you a reset link right away.
        </p>

        <div className="space-y-4 w-full max-w-xs">
          {[
            { icon: <ShieldCheck    className="h-5 w-5" />, title: 'Secure Reset',   desc: 'Your link expires in 15 minutes'  },
            { icon: <Clock          className="h-5 w-5" />, title: 'Quick Delivery', desc: 'Email arrives in under a minute'  },
            { icon: <HeadphonesIcon className="h-5 w-5" />, title: '24/7 Support',   desc: 'We are always here to help you'  },
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

          {!success ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Reset Password</h1>
              <p className="text-gray-500 text-sm mb-8">
                Enter the email address linked to your account and we'll send you a password reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <span className="shrink-0">⚠️</span> {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all" disabled={isLoading}>
                  {isLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Reset Link...</>
                    : '→ Send Reset Link'
                  }
                </Button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Remember your password?{' '}
                <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
              </p>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-6 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</h1>
              <p className="text-gray-500 text-sm mb-2">We've sent a password reset link to:</p>
              <p className="font-semibold text-gray-800 mb-6">{email}</p>
              <p className="text-xs text-gray-400 mb-8">
                Didn't receive it? Check your spam folder or{' '}
                <button onClick={() => { setSuccess(false); setEmail(''); }} className="text-blue-600 hover:underline font-medium">
                  try again
                </button>.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full h-12">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
