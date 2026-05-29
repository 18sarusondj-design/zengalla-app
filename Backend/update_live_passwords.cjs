const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const uri = 'mongodb://18sarusondj:K4jtW12mQOTi27sw@ac-lyaxq8g-shard-00-00.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-01.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-02.gflholb.mongodb.net:27017/test?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(uri).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String, password: String, isVerified: Boolean }, { strict: false }), 'users');
  const hash = await bcrypt.hash('sarusondj@1', 12);
  const result = await User.updateMany(
    { email: { $in: ['sarusondj@gmail.com', 'sarusondj321@gmail.com', 'sarusondj1234@gmail.com', '18sarusondj@gmail.com'] } },
    { $set: { password: hash, isVerified: true } }
  );
  console.log('Users updated:', result.modifiedCount);
  process.exit(0);
}).catch(console.error);
