import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export const sendPushNotification = async (userId, payload) => {
  try {
    const subscriptions = await PushSubscription.find({ userId });
    
    const sendPromises = subscriptions.map(sub => 
      webpush.sendNotification(sub.subscription, JSON.stringify(payload))
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired or no longer valid
            return PushSubscription.deleteOne({ _id: sub._id });
          }
          console.error('Push error:', err);
        })
    );

    await Promise.all(sendPromises);
    return { success: true };
  } catch (err) {
    console.error('Push Service Error:', err);
    return { success: false, error: err.message };
  }
};

export const broadcastPushNotification = async (payload) => {
  try {
    const subscriptions = await PushSubscription.find({});
    
    const sendPromises = subscriptions.map(sub => 
      webpush.sendNotification(sub.subscription, JSON.stringify(payload))
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired or no longer valid
            return PushSubscription.deleteOne({ _id: sub._id });
          }
          console.error('Push broadcast error:', err);
        })
    );

    await Promise.all(sendPromises);
    return { success: true, count: subscriptions.length };
  } catch (err) {
    console.error('Push Broadcast Error:', err);
    return { success: false, error: err.message };
  }
};
