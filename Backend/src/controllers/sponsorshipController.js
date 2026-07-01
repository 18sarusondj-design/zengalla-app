import Sponsorship from '../models/Sponsorship.js';
import Shop from '../models/Shop.js';

export const getSponsorshipStatus = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    
    const pinCode = shop.pinCode;
    if (!pinCode) {
      return res.status(400).json({ error: 'Please update your PIN code in Location Settings first.' });
    }

    // Find all future/active sponsorships for this pincode to calculate slots
    const activeSponsorships = await Sponsorship.find({
      pinCode,
      status: 'ACTIVE',
      endDate: { $gte: new Date() }
    });

    // Check if current shop already has an active, upcoming, or refund requested sponsorship
    const mySponsorships = await Sponsorship.find({
      shopId: shop._id,
      status: { $in: ['ACTIVE', 'REFUND_REQUESTED'] },
      endDate: { $gte: new Date() }
    });
    
    const hasActiveOrUpcoming = mySponsorships.length > 0;
    
    // Find slot availability
    const slotEnds = { 1: Date.now(), 2: Date.now(), 3: Date.now(), 4: Date.now() };
    activeSponsorships.forEach(s => {
      const sEnd = new Date(s.endDate).getTime();
      if (sEnd > slotEnds[s.slotNumber]) {
        slotEnds[s.slotNumber] = sEnd;
      }
    });

    // Find the earliest available slot time
    let earliestAvail = slotEnds[1];
    for (let i = 2; i <= 4; i++) {
      if (slotEnds[i] < earliestAvail) {
        earliestAvail = slotEnds[i];
      }
    }

    const nextAvailableDate = new Date(Math.max(Date.now(), earliestAvail));
    const isImmediate = nextAvailableDate.getTime() <= Date.now();

    res.json({
      success: true,
      hasActiveOrUpcoming,
      mySponsorships,
      nextAvailableDate,
      isImmediate,
      pinCode,
      activeCount: activeSponsorships.length
    });
  } catch (err) {
    console.error('getSponsorshipStatus Error:', err);
    res.status(500).json({ error: err.message });
  }
};

export const requestRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const sponsorship = await Sponsorship.findOne({ _id: id, shopId: shop._id });
    if (!sponsorship) return res.status(404).json({ error: 'Sponsorship not found' });

    if (sponsorship.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Refund already requested or processed' });
    }

    // Must be at least 1 day away
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (new Date(sponsorship.startDate) < tomorrow) {
      return res.status(400).json({ error: 'You can only request a refund at least 24 hours before the sponsorship starts.' });
    }

    sponsorship.status = 'REFUND_REQUESTED';
    await sponsorship.save();

    res.json({ success: true, message: 'Refund request submitted successfully' });
  } catch (err) {
    console.error('requestRefund Error:', err);
    res.status(500).json({ error: err.message });
  }
};
