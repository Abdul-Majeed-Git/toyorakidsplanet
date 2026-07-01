# ToyOraKids 🛍️

A premium, state-of-the-art full-stack e-commerce store specializing in kids' garments and Montessori-inspired developmental toys. 

This store is designed using the **Linear / Modern Design Vibe** (technical minimalism, ambient lighting glows, glassmorphism, and responsive bento grids). It operates in a **hybrid mode**—connecting to a cloud database when configured, or falling back seamlessly to browser-local storage for 100% serverless, free operation!

---

## Key Features

1. **Cinematic UI/UX**: Hover-linked spotlight glows, CSS-animated ambient floating light pools, structural grid overlays, and subtle grain textures.
2. **Interactive Catalog**: Asymmetric Bento grid layout displaying kids' clothes and toys with advanced client-side search, filtering, and sorting.
3. **WhatsApp Order Routing**: Checkout redirects customers straight to WhatsApp with order details (reference ID, names, sizes, quantities, totals in PKR, and links to product images).
4. **Operations Admin Portal**: Safe, password-protected Manager Dashboard (`admin.html`) to upload product images (converted to Base64 data URLs), edit details, modify PKR prices, and delete inventory.
5. **Vercel Serverless Backend**: Node.js API functions (`api/products.js`) that communicate directly with a PostgreSQL/Supabase database.

---

## File Structure

```
e:\toyora website\
├── index.html                   # Home page (Hero, Categories Bento Grid, Featured)
├── shop.html                    # Catalog page (Asymmetric grid, search, filters)
├── product-detail.html          # Detail page (Interactive gallery, specs, direct WhatsApp checkout)
├── wishlist.html                # Saved items (glassmorphic layout)
├── checkout.html                # Form to gather shipping info -> WhatsApp redirect
├── admin.html                   # Admin Panel (Verify passcode: admin123)
├── package.json                 # Vercel backend dependencies
├── vercel.json                  # Vercel API routing parameters
├── .env.example                 # Environment variables template
├── css/
│   └── style.css                # Global Design System tokens & layout styles
├── js/
│   ├── products.js              # Fallback initial product catalog in PKR
│   └── app.js                   # Application state manager & mouse-tracking spotlights
└── images/
    └── products/                # Premium studio-grade AI product images
```

---

## Technical Architecture & Setup

### Option A: Static Deployment (Netlify / GitHub Pages - Rs. 0 Cost)
If you deploy this folder as-is to Netlify (e.g. via drag-and-drop) or GitHub Pages, the backend functions (`/api`) are not used. 
* **How it works**: The website launches instantly. All products added or deleted by the admin are saved to the admin's browser `localStorage`.
* **Deployment**: Simply drag and drop the folder into the Netlify dashboard. Done!

### Option B: Full-Stack Deployment (Vercel + Supabase - Free Shared Database)
To ensure that products uploaded by the admin are visible to **all customers** across the world, connect the backend functions to a free Supabase cloud database.

#### Step 1: Create a Supabase Database
1. Go to [Supabase](https://supabase.com) and create a free project.
2. Navigate to the **SQL Editor** tab in your Supabase dashboard and run the following script to set up your products table:

```sql
-- Create the products table
create table products (
  id text primary key,
  name text not null,
  price numeric not null,
  category text not null,
  description text,
  sizes text,
  age_recommendation text,
  image_url text,
  rating numeric default 5.0,
  reviews_count numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table products enable row level security;

-- Create a policy to allow anyone to read products (anonymous SELECT)
create policy "Allow public read access" on products
  for select using (true);

-- Create a policy to allow anyone to insert/modify products (anonymous ALL)
-- NOTE: For production, secure this policy with your custom authorization headers
create policy "Allow public inserts" on products
  for insert with check (true);

create policy "Allow public deletes" on products
  for delete using (true);
```

#### Step 2: Deploy to Vercel
1. Initialize a Git repository in the project folder and push it to GitHub/GitLab.
2. Import the repository into [Vercel](https://vercel.com).
3. Under the project settings, add the following **Environment Variables** (which you copy from your Supabase Dashboard settings -> API):
   * `SUPABASE_URL`: Your Supabase Project API URL.
   * `SUPABASE_ANON_KEY`: Your Supabase API Anon Key.
4. Click **Deploy**. Vercel will install `@supabase/supabase-js` and host your static frontend and serverless backend API together under one URL.

---

## Local Development

To run the site and test the full-stack API capabilities locally:

1. Install the Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```
2. Navigate to this directory in your terminal and run:
   ```bash
   vercel dev
   ```
3. Open `http://localhost:3000` in your web browser. 

*If you do not have Vercel CLI installed, you can simply run any local static server (like Live Server extension in VS Code) or double-click `index.html` to run in standalone static mode.*

---

## Core Credentials (For testing)
* **Admin Portal Passcode**: `admin123`
* **Default Order WhatsApp Destination**: Configurable by changing the `WHATSAPP_NUMBER` constant at the top of `js/app.js` (currently set to Pakistani format `923001234567`).
