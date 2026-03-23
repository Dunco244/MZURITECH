const express = require('express');
const router = express.Router();
const Subscriber = require('../models/subscriber'); // matches subscriber.js
const { sendNewsletterConfirmation } = require('../services/emailService');

// POST /api/newsletter/subscribe
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if already subscribed
    const existing = await Subscriber.findOne({ email: email.toLowerCase().trim() });

    if (existing) {
      if (existing.isActive) {
        return res.status(400).json({ message: 'This email is already subscribed' });
      }
      // Re-activate if they previously unsubscribed
      existing.isActive = true;
      await existing.save();
      await sendNewsletterConfirmation(email);
      return res.status(200).json({ message: 'Welcome back! You have been re-subscribed.' });
    }

    // Save new subscriber
    await Subscriber.create({ email });

    // Send confirmation email
    await sendNewsletterConfirmation(email);

    return res.status(201).json({ message: 'Successfully subscribed!' });

  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;