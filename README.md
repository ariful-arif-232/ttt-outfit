# TTT Outfit Professional E-commerce

A production-oriented Node.js + Express + MongoDB clothing store with customer accounts, persistent orders, inventory control, admin management, MongoDB-backed sessions and Cloudinary-ready image uploads.

## Features

- Customer registration with own account (email or phone login)
- Secure bcrypt password hashing
- Product catalogue, search, category filters and sorting
- Size/color cart and checkout
- COD, manual bKash and Nagad transaction submission
- Personal order history and order details
- Admin sales dashboard, products, stock, orders and customers
- MongoDB Atlas persistence (works on Vercel)
- Cloudinary image upload with image URL fallback
- Responsive storefront and admin panel

## Local setup

1. Copy `.env.example` to `.env`.
2. Put your MongoDB Atlas connection string in `MONGODB_URI`.
3. Set a long random `SESSION_SECRET`.
4. Optionally add Cloudinary credentials.
5. Install and seed:

```bash
npm install
npm run seed
npm start
```

Open `http://localhost:3000`.

The admin login is created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` when you run `npm run seed`.

## MongoDB connection string

Use a database name in the URI, for example:

```text
mongodb+srv://tttadmin:YOUR_URL_ENCODED_PASSWORD@your-cluster.mongodb.net/ttt_outfit?retryWrites=true&w=majority
```

Special characters in the password must be URL encoded. Never commit `.env`.

## Vercel deployment

Add these Environment Variables in Vercel:

- `MONGODB_URI`
- `SESSION_SECRET`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `CLOUDINARY_CLOUD_NAME` (optional but recommended)
- `CLOUDINARY_API_KEY` (optional)
- `CLOUDINARY_API_SECRET` (optional)

After deployment, seed the database once from your computer using the same environment variables (`npm run seed`). Alternatively seed before deploying.

## Important payment note

bKash/Nagad are implemented as manual transaction-ID submission and admin verification. Automatic merchant payment requires official merchant credentials and gateway-specific server integration. Do not collect card details directly.
