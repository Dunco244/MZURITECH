import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ContactUs() {
  const [form, setForm]       = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError('Please fill in all required fields.');
      return;
    }
    setSending(true);
    setError('');
    try {
      // If you have a contact endpoint wire it here; for now simulate success
      await new Promise(r => setTimeout(r, 1200));
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-secondary text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-3">Contact Us</h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Have a question or need help? We're here for you — reach out and we'll get back to you within 24 hours.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-3 gap-12">

          {/* Contact info */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Get in Touch</h2>
            {[
              { icon: MapPin, label: 'Visit Us',    value: '123 Tech Street, Nairobi, Kenya' },
              { icon: Phone,  label: 'Call Us',     value: '+254 718 010 222' },
              { icon: Mail,   label: 'Email Us',    value: 'support@mzuritech.com' },
              { icon: Clock,  label: 'Working Hours', value: 'Mon–Sat, 8am – 6pm EAT' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="text-gray-800 font-medium mt-0.5">{value}</p>
                </div>
              </div>
            ))}

            {/* Social */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-500 mb-3">Follow us</p>
              <div className="flex gap-3">
                {['Facebook', 'Twitter', 'Instagram', 'YouTube'].map(s => (
                  <a key={s} href="#"
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-primary hover:text-white flex items-center justify-center text-xs font-bold text-gray-500 transition-colors">
                    {s[0]}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              {sent ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-500 mb-6">Thanks for reaching out. We'll get back to you within 24 hours.</p>
                  <Button onClick={() => setSent(false)} variant="outline">Send Another</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Send us a Message</h2>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input id="name" placeholder="Jane Wanjiku" value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input id="email" type="email" placeholder="you@example.com" value={form.email}
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" placeholder="e.g. Order inquiry, Product question..." value={form.subject}
                      onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <textarea id="message" rows={5} placeholder="Tell us how we can help you..."
                      value={form.message}
                      onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                  </div>
                  <Button type="submit" className="btn-primary w-full py-5" disabled={sending}>
                    {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><Send className="w-4 h-4 mr-2" /> Send Message</>}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
