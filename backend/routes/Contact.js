/**
 * Contact Route — MzuriTech
 * POST /api/contact — sends message to kibetdan202@gmail.com via Brevo
 */

const express = require('express');
const router  = express.Router();
const { sendContactEmail } = require('../services/emailService');

router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }

  try {
    await sendContactEmail({ name, email, subject, message });
    return res.json({ success: true, message: 'Message sent successfully.' });
  } catch (error) {
    console.error('❌ Contact route error:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
  }
});

module.exports = router;