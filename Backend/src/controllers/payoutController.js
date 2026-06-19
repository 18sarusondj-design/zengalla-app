import PayoutRequest from '../models/PayoutRequest.js';
import User from '../models/User.js';

const PLATFORM_FEE_PER_PAYOUT = 100;
const PLATFORM_FEE_MAX = 600;
const MIN_WITHDRAWAL = 500;

// ─── DELIVERY PARTNER: Request Payout ─────────────────────────────────────────
// POST /api/payouts/request
export const requestPayout = async (req, res) => {
  try {
    const deliveryPartnerId = req.user.id;
    const { amount, shopId } = req.body;

    if (!amount || !shopId) return res.status(400).json({ error: 'Amount and shopId are required' });

    const requestedAmount = parseFloat(amount);
    if (isNaN(requestedAmount) || requestedAmount < MIN_WITHDRAWAL) {
      return res.status(400).json({ error: `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}` });
    }

    // Check for pending request (can't have two pending)
    const existing = await PayoutRequest.findOne({ deliveryPartnerId, status: 'pending' });
    if (existing) {
      return res.status(400).json({ error: 'You already have a pending payout request. Wait for it to be processed.' });
    }

    // Payout day check: Monday (1) or Friday (5)
    const dayOfWeek = new Date().getDay(); // 0=Sun,1=Mon,...,6=Sat
    if (dayOfWeek !== 1 && dayOfWeek !== 5) {
      return res.status(400).json({ error: 'Payout requests can only be submitted on Monday or Friday.' });
    }

    // Get delivery partner and their current fee deducted
    const partner = await User.findById(deliveryPartnerId);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    const alreadyDeducted = partner.platformFeeDeducted || 0;
    const remaining = PLATFORM_FEE_MAX - alreadyDeducted;
    const deduction = remaining > 0 ? Math.min(PLATFORM_FEE_PER_PAYOUT, remaining) : 0;
    const netAmount = requestedAmount - deduction;

    if (netAmount <= 0) {
      return res.status(400).json({ error: 'Requested amount is too low after platform fee deduction' });
    }

    const payoutReq = await PayoutRequest.create({
      deliveryPartnerId,
      shopId,
      requestedAmount,
      platformDeduction: deduction,
      netAmount,
      totalDeductedBefore: alreadyDeducted,
    });

    res.status(201).json({ success: true, payout: payoutReq });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── DELIVERY PARTNER: Get My Payout Requests ─────────────────────────────────
// GET /api/payouts/my
export const getMyPayouts = async (req, res) => {
  try {
    const payouts = await PayoutRequest.find({ deliveryPartnerId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    const partner = await User.findById(req.user.id).select('platformFeeDeducted walletBalance');
    res.json({ success: true, payouts, platformFeeDeducted: partner?.platformFeeDeducted || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── VENDOR/ADMIN: Get All Payout Requests for their shop ─────────────────────
// GET /api/payouts/shop/:shopId
export const getShopPayouts = async (req, res) => {
  try {
    const payouts = await PayoutRequest.find({ shopId: req.params.shopId })
      .populate('deliveryPartnerId', 'name phone bankName accountName accountNumber ifscCode platformFeeDeducted')
      .sort({ createdAt: -1 });
    res.json({ success: true, payouts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── VENDOR/ADMIN: Approve Payout Request ─────────────────────────────────────
// PATCH /api/payouts/:id/approve
export const approvePayout = async (req, res) => {
  try {
    const payout = await PayoutRequest.findById(req.params.id);
    if (!payout) return res.status(404).json({ error: 'Payout request not found' });
    if (payout.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    payout.status = 'approved';
    payout.adminNote = req.body.note || '';
    await payout.save();

    // Increment platformFeeDeducted on the partner
    await User.findByIdAndUpdate(payout.deliveryPartnerId, {
      $inc: { platformFeeDeducted: payout.platformDeduction }
    });

    const updated = await PayoutRequest.findById(req.params.id)
      .populate('deliveryPartnerId', 'name phone bankName accountName accountNumber ifscCode platformFeeDeducted');
    res.json({ success: true, payout: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── VENDOR/ADMIN: Reject Payout Request ──────────────────────────────────────
// PATCH /api/payouts/:id/reject
export const rejectPayout = async (req, res) => {
  try {
    const payout = await PayoutRequest.findById(req.params.id);
    if (!payout) return res.status(404).json({ error: 'Payout request not found' });
    if (payout.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    payout.status = 'rejected';
    payout.adminNote = req.body.note || '';
    await payout.save();

    res.json({ success: true, payout });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
