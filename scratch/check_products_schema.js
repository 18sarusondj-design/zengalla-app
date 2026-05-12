
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../Frontend/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking Supabase URL:', supabaseUrl);
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching products:', error);
    // Try to get one shop to see if connection works
    const { data: shopData, error: shopError } = await supabase.from('shops').select('*').limit(1);
    if (shopError) console.error('Error fetching shops:', shopError);
    else if (shopData) console.log('Shops columns:', Object.keys(shopData[0]));
    return;
  }

  if (data && data.length > 0) {
    console.log('Products columns found:', Object.keys(data[0]));
  } else {
    console.log('No products found.');
    // Try to insert a dummy product with minimal fields to see what's allowed
    // But we don't want to mess with the DB.
    // Instead, let's try to select specific columns we suspect.
    const suspectColumns = ['id', 'name', 'price', 'business_price', 'wholesale_price', 'stock_quantity', 'shop_id'];
    for (const col of suspectColumns) {
        const { error: colError } = await supabase.from('products').select(col).limit(1);
        if (colError) console.log(`Column ${col} NOT found:`, colError.message);
        else console.log(`Column ${col} EXISTS`);
    }
  }
}

checkSchema();
