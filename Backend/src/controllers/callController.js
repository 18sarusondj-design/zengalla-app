import axios from 'axios';
import Order from '../models/Order.js';

export const initiateMaskedCall = async (req, res) => {
  try {
    const { orderId, callerType } = req.body; 

    // 1. Fetch the order to get both phone numbers
    const order = await Order.findById(orderId).populate('deliveryPartnerId');
    if (!order) return res.status(404).json({ error: 'Order not found' });

    let callerNumber = ''; // The person pressing the button
    let receiverNumber = ''; // The person they want to talk to

    if (callerType === 'delivery_boy') {
      // deliveryPartnerId should be populated, containing the phone
      callerNumber = order.deliveryPartnerId?.phone; 
      receiverNumber = order.phone; // Customer's phone
    } else {
      return res.status(400).json({ error: 'Invalid caller type' });
    }

    if (!callerNumber || !receiverNumber) {
      return res.status(400).json({ error: 'Missing phone numbers for call routing' });
    }

    // 2. Prepare Exotel API Request
    const exotelSid = process.env.EXOTEL_ACCOUNT_SID;
    const apiKey = process.env.EXOTEL_API_KEY;
    const apiToken = process.env.EXOTEL_API_TOKEN;
    const exoPhone = process.env.EXOTEL_EXOPHONE;

    if (!exotelSid || !apiKey || !apiToken || !exoPhone) {
      return res.status(500).json({ error: 'Exotel credentials not configured' });
    }

    // Format numbers to E.164 without '+' or specific to Exotel's requirement (typically 0 or 91 prefix)
    const formatPhone = (num) => {
      const clean = num.replace(/\D/g, '');
      return clean.length === 10 ? `0${clean}` : clean;
    };

    const url = `https://${apiKey}:${apiToken}@api.exotel.com/v1/Accounts/${exotelSid}/Calls/connect.json`;

    // 3. Hit the Exotel API
    const response = await axios.post(url, new URLSearchParams({
      From: formatPhone(callerNumber),      // Exotel calls this person FIRST
      To: formatPhone(receiverNumber),      // Once they pick up, Exotel calls this person
      CallerId: formatPhone(exoPhone),      // This is the number BOTH will see on their screen
      CallType: 'trans'                     // Transactional call
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    // 4. Success
    res.status(200).json({ 
      success: true, 
      message: 'Call initiated! Please answer your phone to connect to the customer.' 
    });

  } catch (error) {
    console.error('Exotel Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to connect call via Exotel' });
  }
};
