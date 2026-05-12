import PushSubscription from '../models/PushSubscription.js';

export const subscribe = async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'Subscription is required' });

    // Check if subscription already exists for this endpoint
    const existing = await PushSubscription.findOne({ 'subscription.endpoint': subscription.endpoint });
    
    if (existing) {
      existing.userId = req.user._id; // Update user if changed
      await existing.save();
    } else {
      await PushSubscription.create({
        userId: req.user._id,
        subscription
      });
    }

    res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    await PushSubscription.deleteOne({ 'subscription.endpoint': endpoint });
    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
