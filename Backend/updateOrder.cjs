const mongoose = require('mongoose');
mongoose.connect('mongodb://18sarusondj:FPBNzkjqgJ8fBZ8k@ac-lyaxq8g-shard-00-00.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-01.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-02.gflholb.mongodb.net:27017/test?ssl=true&replicaSet=atlas-r0os8d-shard-0&authSource=admin&appName=Cluster0')
.then(async () => { 
  const Order = mongoose.model('Order', new mongoose.Schema({}, {strict: false})); 
  await Order.updateOne({_id: '6a0c8ae9592d552bcf1c2d81'}, {$set: {deliveryFee: 50, extraAmount: 20}}); 
  console.log('Updated'); 
  process.exit(); 
});
