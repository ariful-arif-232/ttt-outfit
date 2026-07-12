require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');

const products = [
  { name: 'Essential Oversized Tee', slug: 'essential-oversized-tee', sku: 'TTT-TEE-001', description: 'Premium heavyweight cotton oversized t-shirt with a clean everyday silhouette.', category: 'T-Shirts', gender: 'Unisex', material: '100% Cotton', price: 890, compareAtPrice: 1090, stock: 40, sizes: ['S','M','L','XL'], colors: ['Black','White','Olive'], featured: true, active: true, images: [{ url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1000&q=80' }] },
  { name: 'Urban Cargo Pants', slug: 'urban-cargo-pants', sku: 'TTT-PNT-001', description: 'Relaxed-fit cargo trousers with functional pockets and durable twill fabric.', category: 'Pants', gender: 'Unisex', material: 'Cotton Twill', price: 1590, compareAtPrice: 1890, stock: 26, sizes: ['28','30','32','34','36'], colors: ['Black','Khaki'], featured: true, active: true, images: [{ url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1000&q=80' }] },
  { name: 'Classic Denim Jacket', slug: 'classic-denim-jacket', sku: 'TTT-JKT-001', description: 'A timeless denim jacket designed for layering across every season.', category: 'Jackets', gender: 'Unisex', material: 'Denim', price: 2290, compareAtPrice: 2690, stock: 18, sizes: ['S','M','L','XL'], colors: ['Blue','Black'], featured: true, active: true, images: [{ url: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=1000&q=80' }] },
  { name: 'Minimal Polo Shirt', slug: 'minimal-polo-shirt', sku: 'TTT-POL-001', description: 'Soft, breathable polo shirt with a minimal embroidered finish.', category: 'Polo', gender: 'Men', material: 'Cotton Pique', price: 1190, compareAtPrice: 1390, stock: 32, sizes: ['M','L','XL','XXL'], colors: ['Navy','White','Maroon'], featured: true, active: true, images: [{ url: 'https://images.unsplash.com/photo-1625910513413-5fc45e562769?auto=format&fit=crop&w=1000&q=80' }] }
];

(async () => {
  await connectDB();
const email = (process.env.ADMIN_EMAIL || 'admin@tttoutfit.com').toLowerCase();
const password = process.env.ADMIN_PASSWORD || 'ChangeThisStrongPassword123!';
const adminPhone = process.env.ADMIN_PHONE || '01999999999';

await User.findOneAndUpdate(
  { email },
  {
    name: process.env.ADMIN_NAME || 'TTT Outfit Admin',
    email,
    phone: adminPhone,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'admin',
    isActive: true
  },
  {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  }
);
  console.log('Seed complete. Admin:', email);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
