// Initial product catalog with PKR pricing and relative image paths
const initialProducts = [
  {
    id: "denim-dungaree",
    name: "Little Explorer Denim Dungaree",
    price: 2990,
    category: "garment",
    description: "Crafted from ultra-soft, premium organic denim, this dungaree features adjustable straps, side buttons, and deep front pockets. Engineered for play, it provides maximum breathability and stretch for your toddler's everyday adventures.",
    sizes: "6-12m, 1-2y, 3-4y",
    age_recommendation: "6 months - 4 years",
    image_url: "images/products/denim_dungaree.png",
    rating: 4.8,
    reviews_count: 18,
    details: "100% Organic Denim Cotton. Machine washable. Adjustable strap buckles to accommodate rapid growth."
  },
  {
    id: "knit-sweater",
    name: "Pastel Dream Cotton Knit Sweater",
    price: 2490,
    category: "garment",
    description: "A cozy, premium cotton-blend knit sweater in warm pastel hues. Designed with a gentle drop shoulder, ribbed cuffs, and an ultra-soft texture that is guaranteed itch-free on kids' sensitive skin.",
    sizes: "1-2y, 3-4y, 5-6y",
    age_recommendation: "1 - 6 years",
    image_url: "images/products/knit_sweater.png",
    rating: 4.9,
    reviews_count: 14,
    details: "80% Soft Cotton, 20% Eco-Acrylic. Hand wash recommended. Hypoallergenic, thermal retention weave."
  },
  {
    id: "linen-romper",
    name: "Sunny Day Linen Romper",
    price: 1890,
    category: "garment",
    description: "Lightweight, airy, and beautifully textured, this linen romper features cross-back straps and convenient bottom snaps for quick changes. Ideal for warm summer afternoons and outdoor styling.",
    sizes: "3-6m, 6-12m, 1-2y",
    age_recommendation: "3 months - 2 years",
    image_url: "images/products/linen_romper.png",
    rating: 4.7,
    reviews_count: 22,
    details: "70% Organic Linen, 30% Pure Cotton. Breathable slub texture. Double-stitched seams."
  },
  {
    id: "fleece-hoodie",
    name: "Cozy Bear Fleece Hoodie",
    price: 2790,
    category: "garment",
    description: "Keep them warm and looking adorable with this super-soft fleece hoodie featuring playful teddy bear ears on the hood. Complete with a soft jersey lining and spacious front kangaroo pockets.",
    sizes: "6-12m, 1-2y, 3-4y, 5-6y",
    age_recommendation: "6 months - 6 years",
    image_url: "images/products/fleece_hoodie.png",
    rating: 5.0,
    reviews_count: 31,
    details: "100% Polyester Fleece with 100% Cotton inner hood lining. Heavyweight insulation, shrink-resistant."
  },
  {
    id: "stacking-rings",
    name: "Rainbow Wooden Stacking Rings",
    price: 1490,
    category: "toy",
    description: "A classic Montessori-style developmental toy made of premium beachwood. Painted with non-toxic, water-based baby-safe paints. Helps develop hand-eye coordination, fine motor skills, and color recognition.",
    sizes: "One Size",
    age_recommendation: "10 months - 3 years",
    image_url: "images/products/stacking_rings.png",
    rating: 4.9,
    reviews_count: 26,
    details: "Made from FSC-certified Beachwood. Water-based paint finish. Safe rounded edges with zero splinter risk."
  },
  {
    id: "bunny-plush",
    name: "Plush Organic Cotton Bunny",
    price: 1290,
    category: "toy",
    description: "A super soft, huggable snuggle buddy made with 100% organic cotton fabrics and hypoallergenic fiber stuffing. Features long floppy ears and a beautifully embroidered face, making it safe for newborns.",
    sizes: "One Size",
    age_recommendation: "All Ages",
    image_url: "images/products/bunny_plush.png",
    rating: 4.8,
    reviews_count: 40,
    details: "Outer: 100% Organic Cotton. Inner: Recycled Hypoallergenic Fiber. Stitched details (no buttons or loose plastic)."
  }
];

// Export if running in node environment (for future testing/server use)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initialProducts };
}
