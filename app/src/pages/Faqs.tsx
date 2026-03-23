import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const faqs = [
  {
    category: 'Orders & Payments',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept M-Pesa (STK Push) and Cash on Delivery. COD is available for orders within Nairobi and select counties.' },
      { q: 'Can I place an order without creating an account?', a: 'Yes! You can checkout as a guest. Just enter your email address and delivery details — no account needed. You\'ll receive an order confirmation email and can track your order using your order number.' },
      { q: 'How do I pay via M-Pesa?', a: 'Select M-Pesa at checkout and enter your M-Pesa registered phone number. You\'ll receive an STK Push prompt on your phone — enter your PIN to complete payment. The prompt expires in 5 minutes.' },
      { q: 'Is my payment information secure?', a: 'Yes. We use industry-standard encryption. We never store your M-Pesa PIN. All transactions are processed through Safaricom\'s secure M-Pesa gateway.' },
      { q: 'Can I cancel my order?', a: 'You can cancel a pending order from your Orders page before it moves to "Processing" status. Once processing has begun, please contact us immediately at support@mzuritech.com.' },
    ],
  },
  {
    category: 'Shipping & Delivery',
    items: [
      { q: 'How long does delivery take?', a: 'Nairobi and surrounding areas (Kiambu, Ruiru, Thika): 1–2 business days. Rest of Kenya: 3–5 business days. You\'ll receive an estimated delivery date in your confirmation email.' },
      { q: 'Do you offer free shipping?', a: 'Yes! Orders over KES 50,000 qualify for free shipping. For orders below that, a flat shipping fee of KES 350 applies.' },
      { q: 'Can I track my order?', a: 'Absolutely. Logged-in users can track orders on the Orders page. Guest shoppers can use the Track Order page with their order number and email address.' },
      { q: 'Do you deliver outside Nairobi?', a: 'Yes, we deliver across Kenya through our logistics partners. Remote areas may take longer and incur additional charges — our team will contact you if this applies to your order.' },
    ],
  },
  {
    category: 'Returns & Warranty',
    items: [
      { q: 'What is your return policy?', a: 'We offer a 30-day return policy on all products. Items must be unused, in original packaging, with all accessories included. Contact us at support@mzuritech.com to initiate a return.' },
      { q: 'What warranty do products come with?', a: 'All products come with the manufacturer\'s warranty. Laptops and phones typically have a 1–2 year warranty. We also offer extended warranty options at checkout.' },
      { q: 'What if I receive a damaged or wrong item?', a: 'Contact us within 48 hours of delivery with photos of the item. We\'ll arrange a replacement or full refund at no cost to you.' },
      { q: 'How long do refunds take?', a: 'M-Pesa refunds are processed within 3-5 business days.' },
    ],
  },
  {
    category: 'Products & Stock',
    items: [
      { q: 'Are all products brand new?', a: 'Yes. All products sold on MzuriTech are 100% brand new and sourced from authorised distributors and manufacturers.' },
      { q: 'What does "Out of Stock" mean?', a: 'The item is temporarily unavailable. You can contact us to be notified when it\'s back in stock.' },
      { q: 'Do you price-match?', a: 'We strive to offer the best prices in Kenya. If you find a lower price from an authorised dealer, contact us and we\'ll do our best to match it.' },
    ],
  },
];

export default function FAQs() {
  const [openItem, setOpenItem]     = useState<string | null>(null);
  const [search, setSearch]         = useState('');

  const filtered = faqs.map(cat => ({
    ...cat,
    items: cat.items.filter(
      item => !search || item.q.toLowerCase().includes(search.toLowerCase()) || item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-secondary text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-3">Frequently Asked Questions</h1>
          <p className="text-white/70 text-lg mb-8">Find answers to common questions about orders, payments, delivery and more.</p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-white text-gray-900 border-0 h-12 rounded-xl shadow-lg"
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-16 space-y-10">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-medium">No results for "{search}"</p>
            <p className="text-sm mt-1">Try a different search term or browse all categories.</p>
          </div>
        ) : filtered.map(cat => (
          <div key={cat.category}>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full inline-block" />
              {cat.category}
            </h2>
            <div className="space-y-2">
              {cat.items.map(item => {
                const id = `${cat.category}-${item.q}`;
                const open = openItem === id;
                return (
                  <div key={item.q} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                    <button
                      className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                      onClick={() => setOpenItem(open ? null : id)}
                    >
                      <span className="font-medium text-gray-800 text-sm leading-snug">{item.q}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Still need help */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center">
          <h3 className="font-bold text-gray-900 mb-2">Still have questions?</h3>
          <p className="text-gray-500 text-sm mb-4">Our support team is available Mon–Sat, 8am–6pm EAT</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="mailto:support@mzuritech.com" className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
              Email Support
            </a>
            <a href="tel:+254718010222" className="px-5 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:border-primary hover:text-primary transition-colors">
              +254 718 010 222
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

