import { Users, Target, Award, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const team = [
  { name: 'Brian Kibet',    role: 'Founder & CEO',       initials: 'BK', color: 'bg-blue-100 text-blue-700' },
  { name: 'Amina Hassan',   role: 'Head of Operations',  initials: 'AH', color: 'bg-purple-100 text-purple-700' },
  { name: 'David Mwangi',   role: 'Lead Engineer',       initials: 'DM', color: 'bg-green-100 text-green-700' },
  { name: 'Grace Otieno',   role: 'Customer Success',    initials: 'GO', color: 'bg-amber-100 text-amber-700' },
];

const stats = [
  { value: '5,000+',  label: 'Happy Customers' },
  { value: '1,200+',  label: 'Products Listed' },
  { value: '47',      label: 'Counties Served' },
  { value: '4.9★',    label: 'Average Rating' },
];

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-secondary text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-3xl">M</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">About MzuriTech</h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto leading-relaxed">
            We're on a mission to make premium electronics accessible to every Kenyan — with genuine products, honest prices, and service that actually cares.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-1">{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Story */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">Our Story</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>MzuriTech was founded in Nairobi in 2022 with a simple frustration: buying quality electronics in Kenya was either too expensive, too risky, or both. Grey-market products, inflated prices, and zero after-sales support had become the norm.</p>
            <p>We set out to change that. By working directly with authorised distributors and manufacturers, we're able to offer genuine products at fair prices — backed by real warranties and a support team you can actually reach.</p>
            <p>Today, MzuriTech serves customers across all 47 counties, with a growing catalogue of laptops, phones, accessories, audio equipment, and more. We're just getting started.</p>
          </div>
        </section>

        {/* Values */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">What We Stand For</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: Award,      title: 'Genuine Products',    desc: '100% authentic goods sourced from authorised distributors. No grey-market, no counterfeits — ever.', color: 'text-yellow-600 bg-yellow-100' },
              { icon: Target,     title: 'Fair Pricing',        desc: 'We cut out unnecessary middlemen so you get the best price without compromising on quality.', color: 'text-blue-600 bg-blue-100' },
              { icon: Users,      title: 'Real Support',        desc: 'A team of real people who pick up the phone, respond to emails, and actually solve your problems.', color: 'text-green-600 bg-green-100' },
              { icon: TrendingUp, title: 'Community First',     desc: 'We reinvest in the local tech ecosystem — from vendor partnerships to student discount programmes.', color: 'text-purple-600 bg-purple-100' },
            ].map(v => (
              <div key={v.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${v.color}`}>
                  <v.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{v.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Meet the Team</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {team.map(member => (
              <div key={member.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold ${member.color}`}>
                  {member.initials}
                </div>
                <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{member.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="bg-secondary rounded-2xl p-10 text-center text-white">
          <h3 className="text-2xl font-bold mb-3">Want to sell with us?</h3>
          <p className="text-white/70 mb-6 max-w-lg mx-auto">Join our growing marketplace and reach thousands of tech customers across Kenya.</p>
          <Button asChild className="bg-primary hover:bg-primary/90 text-white">
            <Link to="/register-vendor">Become a Vendor</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}