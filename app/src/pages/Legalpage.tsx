import { useParams, Link } from 'react-router-dom';
import { Shield, FileText, Cookie } from 'lucide-react';

const pages = {
  privacy: {
    title: 'Privacy Policy',
    icon: Shield,
    lastUpdated: 'March 2026',
    sections: [
      {
        heading: '1. Information We Collect',
        content: `When you use MzuriTech, we collect information you provide directly, such as your name, email address, phone number, and delivery address when you create an account or place an order. We also collect payment information processed securely through Safaricom M-Pesa � we never store your PIN on our servers.

We automatically collect certain technical data such as your IP address, browser type, device information, and browsing behaviour on our platform to improve your experience.`,
      },
      {
        heading: '2. How We Use Your Information',
        content: `We use your information to process and fulfil your orders, send order confirmations and delivery updates, provide customer support, personalise your shopping experience, send promotional communications (only if you opt in), and improve our platform and services.

We do not sell, rent, or share your personal information with third parties for their own marketing purposes.`,
      },
      {
        heading: '3. Data Security',
        content: `We implement industry-standard security measures to protect your personal information, including SSL/TLS encryption for all data transmissions, secure storage with access controls, and regular security audits. Despite these measures, no internet transmission is 100% secure, and we encourage you to use strong passwords and keep your account credentials safe.`,
      },
      {
        heading: '4. Cookies',
        content: `We use cookies and similar technologies to maintain your session, remember your preferences, and analyse how our platform is used. You can control cookies through your browser settings. See our Cookie Policy for more details.`,
      },
      {
        heading: '5. Your Rights',
        content: `You have the right to access, correct, or delete your personal data at any time. You can update your information from your account profile page. To request deletion of your account or data, contact us at kibetdan202@gmail.com. We will process your request within 30 days.`,
      },
      {
        heading: '6. Contact Us',
        content: `For any privacy-related questions, contact our Data Protection Officer at kibetdan202@gmail.com or write to us at 123 Tech Street, Nairobi, Kenya.`,
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    icon: FileText,
    lastUpdated: 'March 2026',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        content: `By accessing or using MzuriTech's website and services, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our services.`,
      },
      {
        heading: '2. Products and Pricing',
        content: `All products listed on MzuriTech are subject to availability. Prices are displayed in Kenyan Shillings (KES) and are inclusive of applicable VAT. We reserve the right to modify prices at any time. In the event of a pricing error, we will contact you before processing your order.`,
      },
      {
        heading: '3. Orders and Payment',
        content: `By placing an order, you represent that you are authorised to use the selected payment method. Orders are confirmed upon successful payment. For M-Pesa payments, your order is confirmed when we receive the transaction confirmation from Safaricom. We reserve the right to cancel orders that cannot be verified or fulfilled.`,
      },
      {
        heading: '4. Delivery',
        content: `Delivery timelines are estimates and not guaranteed. MzuriTech is not liable for delays caused by third-party logistics providers, weather conditions, or other circumstances beyond our control. Risk of loss and title transfer to you upon delivery.`,
      },
      {
        heading: '5. Returns and Refunds',
        content: `Returns are subject to our Returns Policy. Refunds are processed to the original payment method within 3–10 business days of receiving the returned item. We reserve the right to refuse returns that do not meet our policy criteria.`,
      },
      {
        heading: '6. Intellectual Property',
        content: `All content on this platform — including logos, images, product descriptions, and software — is the property of MzuriTech or its licensors. You may not reproduce, distribute, or create derivative works without our written permission.`,
      },
      {
        heading: '7. Limitation of Liability',
        content: `To the fullest extent permitted by Kenyan law, MzuriTech shall not be liable for any indirect, incidental, or consequential damages arising from your use of our platform or products. Our total liability shall not exceed the amount you paid for the relevant order.`,
      },
      {
        heading: '8. Governing Law',
        content: `These Terms are governed by the laws of Kenya. Any disputes shall be resolved in the courts of Nairobi, Kenya.`,
      },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    icon: Cookie,
    lastUpdated: 'March 2026',
    sections: [
      {
        heading: '1. What Are Cookies?',
        content: `Cookies are small text files placed on your device when you visit a website. They help websites remember your preferences, keep you logged in, and understand how the site is being used.`,
      },
      {
        heading: '2. Cookies We Use',
        content: `Essential Cookies: Required for the platform to function — they keep you logged in, maintain your shopping cart, and ensure secure transactions. These cannot be disabled.

Performance Cookies: Help us understand how visitors interact with our site (e.g., which pages are visited most). We use this data to improve the user experience. These are anonymised and do not identify individuals.

Preference Cookies: Remember your settings such as your preferred language or region.

Marketing Cookies: Used to show you relevant promotions. We only use these if you have given your consent.`,
      },
      {
        heading: '3. Third-Party Cookies',
        content: `Some cookies are set by third-party services we use, such as payment processors (Safaricom M-Pesa, Stripe) and analytics tools. These parties have their own privacy policies.`,
      },
      {
        heading: '4. Managing Cookies',
        content: `You can control and delete cookies through your browser settings. Disabling essential cookies may affect the functionality of our platform — for example, your cart may not work correctly. Most browsers allow you to block or delete cookies via Settings > Privacy or similar.`,
      },
      {
        heading: '5. Updates to This Policy',
        content: `We may update this Cookie Policy from time to time. We will notify you of significant changes by displaying a notice on our platform.`,
      },
    ],
  },
};

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = pages[slug as keyof typeof pages];

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Page not found.</p>
          <Link to="/" className="text-primary underline">Go home</Link>
        </div>
      </div>
    );
  }

  const Icon = page.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-secondary text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Icon className="w-6 h-6 text-primary-light" />
          </div>
          <h1 className="text-4xl font-bold mb-2">{page.title}</h1>
          <p className="text-white/50 text-sm">Last updated: {page.lastUpdated}</p>
        </div>
      </div>

      {/* Quick nav between legal pages */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {Object.entries(pages).map(([key, p]) => (
              <Link key={key} to={`/legal/${key}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  slug === key ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                {p.title}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {page.sections.map(section => (
          <section key={section.heading} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100">{section.heading}</h2>
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{section.content}</div>
          </section>
        ))}

        <div className="text-center py-6 text-sm text-gray-400">
          Questions? Contact us at{' '}
          <a href="mailto:kibetdan202@gmail.com" className="text-primary underline">kibetdan202@gmail.com</a>
        </div>
      </div>
    </div>
  );
}


