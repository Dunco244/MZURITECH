import {
  Facebook, Twitter, Instagram, Youtube,
  MapPin, Phone, Mail, Store,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const footerLinks = {
  shop: [
    { name: 'Laptops',     href: '/laptops' },
    { name: 'Phones',      href: '/phones' },
    { name: 'Audio',       href: '/shop' },
    { name: 'Gaming',      href: '/shop' },
    { name: 'Accessories', href: '/accessories' },
  ],
  support: [
    { name: 'Contact Us',         href: '/contact' },
    { name: 'FAQs',               href: '/faqs' },
    { name: 'Track Order',        href: 'SMART' },
  ],
  company: [
    { name: 'About Us',          href: '/about' },
    { name: 'Careers',           href: '/about#team' },
    { name: 'Privacy Policy',    href: '/legal/privacy' },
    { name: 'Terms of Service',  href: '/legal/terms' },
  ],
};

const socialLinks = [
  { icon: Facebook,  href: 'https://facebook.com',  label: 'Facebook' },
  { icon: Twitter,   href: 'https://twitter.com',   label: 'Twitter' },
  { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: Youtube,   href: 'https://youtube.com',   label: 'YouTube' },
];

export default function Footer() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleTrackOrder = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(user ? '/orders' : '/track-order');
  };

  return (
    <footer className="bg-secondary text-white">

      {/* ── Vendor CTA — always visible ── */}
      <div className="border-b border-white/10">
        <div className="section-padding py-6">
          <div className="container-custom flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/25 flex items-center justify-center flex-shrink-0">
                <Store className="w-4 h-4 text-primary-light" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Become a Vendor</div>
                <div className="text-white/50 text-xs">Sell on MzuriTech and reach thousands of customers.</div>
                <p className="text-white/60 text-sm max-w-md leading-relaxed mt-2">
                  Join our marketplace, list your products, and grow your revenue. Setup takes less than 10 minutes.
                </p>
              </div>
            </div>
            <Link
              to="/register-vendor"
              className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors shadow-lg shadow-primary/30"
            >
              <Store className="w-4 h-4" />
              Sign Up Now
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main Footer Links ── */}
      <div className="section-padding py-12">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">

            {/* Brand */}
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-xl font-bold">MzuriTech</span>
              </Link>
              <p className="text-white/50 text-sm mb-6 max-w-xs leading-relaxed">
                Your trusted destination for premium electronics in Kenya.
              </p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-sm text-white/50">
                  <MapPin className="w-4 h-4 text-primary-light flex-shrink-0" />
                  <span>123 Tech Street, Nairobi, Kenya</span>
                </div>
                <a href="tel:+254718010222" className="flex items-center gap-3 text-sm text-white/50 hover:text-white transition-colors">
                  <Phone className="w-4 h-4 text-primary-light flex-shrink-0" />
                  <span>+254 718 010 222</span>
                </a>
                <a href="mailto:kibetdan202@gmail.com" className="flex items-center gap-3 text-sm text-white/50 hover:text-white transition-colors">
                  <Mail className="w-4 h-4 text-primary-light flex-shrink-0" />
                  <span>kibetdan202@gmail.com</span>
                </a>
              </div>
            </div>

            {/* Shop */}
            <div>
              <h4 className="font-semibold text-sm mb-4 uppercase tracking-wide">Shop</h4>
              <ul className="space-y-2.5">
                {footerLinks.shop.map(link => (
                  <li key={link.name}>
                    <Link to={link.href} className="text-sm text-white/50 hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold text-sm mb-4 uppercase tracking-wide">Support</h4>
              <ul className="space-y-2.5">
                {footerLinks.support.map(link => (
                  <li key={link.name}>
                    {link.href === 'SMART' ? (
                      <a href="#" onClick={handleTrackOrder}
                        className="text-sm text-white/50 hover:text-white transition-colors cursor-pointer">
                        {link.name}
                      </a>
                    ) : (
                      <Link to={link.href} className="text-sm text-white/50 hover:text-white transition-colors">
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-sm mb-4 uppercase tracking-wide">Company</h4>
              <ul className="space-y-2.5">
                {footerLinks.company.map(link => (
                  <li key={link.name}>
                    <Link to={link.href} className="text-sm text-white/50 hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="border-t border-white/10">
        <div className="section-padding py-5">
          <div className="container-custom">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">

              <p className="text-sm text-white/40">© 2026 MzuriTech. All rights reserved.</p>

              <div className="flex items-center gap-2">
                {socialLinks.map(social => (
                  <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer"
                    aria-label={social.label}
                    className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-primary/80 transition-colors">
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">We accept:</span>
                {['M-Pesa', 'Visa', 'MC'].map(method => (
                  <div key={method} className="px-2 h-6 bg-white/10 rounded text-[10px] font-medium flex items-center">
                    {method}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
