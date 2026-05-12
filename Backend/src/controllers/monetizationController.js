import Shop from '../models/Shop.js';
import User from '../models/User.js';
import { sendOTP, sendAdminAlert } from '../utils/mailer.js'; // Reusing mailer for notifications

// POST /api/monetization/select-plan
export const selectPlan = async (req, res) => {
  try {
    const { plan, sponsorshipRequested } = req.body;
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop record not found' });

    shop.subscriptionPlan = plan;
    
    // If they want paid sponsorship, check availability
    if (sponsorshipRequested) {
      const paidCount = await Shop.countDocuments({ 
        pinCode: shop.pinCode, 
        sponsorshipType: 'paid' 
      });
      if (paidCount >= 3) {
        return res.status(400).json({ error: 'All 3 paid sponsorship slots in your Pin Code are currently full.' });
      }
      shop.sponsorshipType = 'paid';
      shop.sponsorshipExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week
    }

    await shop.save();

    // Respond immediately - don't block on email
    res.json({ success: true, message: 'Plan selected! Waiting for final admin activation.' });

    // Notify Admin via Email (non-blocking - won't crash if email fails)
    try {
      const subject = `New Plan Selection: ${shop.name}`;
      const msg = `Vendor <b>${req.user.name}</b> has selected the <b>${plan.toUpperCase()}</b> plan for shop <b>${shop.name}</b>. <br/> Sponsorship Requested: ${sponsorshipRequested ? 'YES' : 'NO'}.`;
      await sendAdminAlert(subject, msg);
    } catch (emailErr) {
      console.warn('Admin email notification failed (non-critical):', emailErr.message);
    }

  } catch (err) {
    console.error('SELECT_PLAN_ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};

// Logic for the Weekly Wildcard Rotation (to be called by Cron)
export const rotateWildcards = async () => {
  try {
    const pinCodes = await Shop.distinct('pinCode');
    
    for (const pin of pinCodes) {
      // 1. Remove current wildcard for this pin
      await Shop.updateMany({ pinCode: pin, sponsorshipType: 'wildcard' }, { sponsorshipType: 'none' });

      // 2. Check if there are at least 2 paid sponsors in this PIN code
      const paidCount = await Shop.countDocuments({ pinCode: pin, sponsorshipType: 'paid' });
      if (paidCount < 2) {
        console.log(`Skipping wildcard for ${pin} - insufficient paid sponsors (${paidCount}/2)`);
        continue;
      }

      // 3. Find eligible shops (those who haven't had it yet, ordered by rating)
      let candidate = await Shop.findOne({ 
        pinCode: pin, 
        hadFreeSponsorship: false,
        isActive: true,
        sponsorshipType: 'none' // Ensure we don't overwrite a paid sponsor or another special status
      }).sort({ rating: -1, totalOrders: -1 });

      // 4. If everyone has had a turn, reset and start over from highest rated
      if (!candidate) {
        await Shop.updateMany({ pinCode: pin, sponsorshipType: 'none' }, { hadFreeSponsorship: false });
        candidate = await Shop.findOne({ 
          pinCode: pin, 
          isActive: true,
          sponsorshipType: 'none'
        }).sort({ rating: -1, totalOrders: -1 });
      }

      if (candidate) {
        candidate.sponsorshipType = 'wildcard';
        candidate.hadFreeSponsorship = true;
        candidate.lastWildcardDate = new Date();
        await candidate.save();
        console.log(`Wildcard assigned to ${candidate.name} in ${pin}`);
      }
    }
  } catch (err) {
    console.error("Rotation Error:", err);
  }
};
