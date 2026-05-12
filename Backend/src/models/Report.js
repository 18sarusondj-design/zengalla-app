import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  senderName: { type: String, required: true },
  email: { type: String, required: true },
  userRole: { type: String, required: true },
  message: { type: String, required: true },
  replyMessage: { type: String, default: '' },
  status: { type: String, default: 'PENDING', enum: ['PENDING', 'RESOLVED'] },
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);
