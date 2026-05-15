import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'Backend', '.env') });

async function updateUserLocation() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    await User.updateOne(
      { email: 'sarusondj@gmail.com' }, 
      { 
        $set: { 
          location: { 
            type: 'Point', 
            coordinates: [73.8567, 18.5204] // Pune coordinates
          } 
        } 
      }
    );
    console.log('SUCCESS: User location updated to Pune.');
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

updateUserLocation();
