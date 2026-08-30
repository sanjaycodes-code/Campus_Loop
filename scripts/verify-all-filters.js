const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const Listing = require('../models/Listing');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function runFilterTests() {
  console.log('\x1b[36m%s\x1b[0m', '=== Starting Automated Search & Filter Verification ===\n');

  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  const dummyOwner = new mongoose.Types.ObjectId();

  // Seed 4 test items
  const testData = [
    {
      title: 'Casio fx-991EX ClassWiz Calculator',
      description: 'Scientific calculator for engineering midterms',
      category: 'gadget',
      pricePerDay: 20,
      condition: 'like_new',
      isAvailable: true,
      owner: dummyOwner,
    },
    {
      title: 'Data Structures and Algorithms in C++',
      description: 'DSA course book with handwritten notes',
      category: 'book',
      pricePerDay: 10,
      condition: 'good',
      isAvailable: true,
      owner: dummyOwner,
    },
    {
      title: 'iPad Pro 11-inch M2 with Apple Pencil',
      description: 'Digital note-taking device for semester lectures',
      category: 'device',
      pricePerDay: 120,
      condition: 'brand_new',
      isAvailable: true,
      owner: dummyOwner,
    },
    {
      title: 'Sony Wireless Headphones (Rented)',
      description: 'Noise cancelling for study halls',
      category: 'gadget',
      pricePerDay: 40,
      condition: 'good',
      isAvailable: false,
      owner: dummyOwner,
    },
  ];

  const createdItems = await Listing.insertMany(testData);
  console.log(`✔ Seeded 4 temporary test listings for verification.\n`);

  try {
    // Test 1: Category Filter (gadget)
    const t1 = await Listing.find({ category: 'gadget', _id: { $in: createdItems.map((i) => i._id) } });
    console.log('1. Category Filter ("gadget"):');
    console.log(`   Matches: ${t1.length} (Expected: 2)`);
    console.log(t1.length === 2 ? '   \x1b[32m✔ PASS\x1b[0m\n' : '   \x1b[31m✖ FAIL\x1b[0m\n');

    // Test 2: Price Range Filter (15 <= price <= 50)
    const t2 = await Listing.find({
      pricePerDay: { $gte: 15, $lte: 50 },
      _id: { $in: createdItems.map((i) => i._id) },
    });
    console.log('2. Price Range Filter (₹15 - ₹50):');
    console.log(`   Matches: ${t2.length} (Expected: 2 -> Calculator ₹20 & Headphones ₹40)`);
    console.log(t2.length === 2 ? '   \x1b[32m✔ PASS\x1b[0m\n' : '   \x1b[31m✖ FAIL\x1b[0m\n');

    // Test 3: Multi-Filter AND (Category=gadget AND isAvailable=true AND maxPrice=30)
    const t3 = await Listing.find({
      category: 'gadget',
      isAvailable: true,
      pricePerDay: { $lte: 30 },
      _id: { $in: createdItems.map((i) => i._id) },
    });
    console.log('3. Multi-Criteria AND Filter (category=gadget AND available=true AND price<=30):');
    console.log(`   Matches: ${t3.length} (Expected: 1 -> Casio Calculator)`);
    console.log(
      t3.length === 1 && t3[0].title.includes('Calculator')
        ? '   \x1b[32m✔ PASS\x1b[0m\n'
        : '   \x1b[31m✖ FAIL\x1b[0m\n'
    );

    // Test 4: Text Search (partial regex "C++")
    const searchRegex = new RegExp(escapeRegex('C++'), 'i');
    const t4 = await Listing.find({
      $or: [{ title: searchRegex }, { description: searchRegex }],
      _id: { $in: createdItems.map((i) => i._id) },
    });
    console.log('4. Special Character Partial Search ("C++"):');
    console.log(`   Matches: ${t4.length} (Expected: 1 -> DSA Book)`);
    console.log(
      t4.length === 1 && t4[0].title.includes('C++')
        ? '   \x1b[32m✔ PASS\x1b[0m\n'
        : '   \x1b[31m✖ FAIL\x1b[0m\n'
    );

    // Test 5: Edge Case - minPrice (100) > maxPrice (20)
    const t5 = await Listing.find({
      pricePerDay: { $gte: 100, $lte: 20 },
      _id: { $in: createdItems.map((i) => i._id) },
    });
    console.log('5. Edge Case: Impossible Price Range (minPrice=100 > maxPrice=20):');
    console.log(`   Matches: ${t5.length} (Expected: 0)`);
    console.log(t5.length === 0 ? '   \x1b[32m✔ PASS\x1b[0m\n' : '   \x1b[31m✖ FAIL\x1b[0m\n');
  } finally {
    // Cleanup
    await Listing.deleteMany({ _id: { $in: createdItems.map((i) => i._id) } });
    console.log('✔ Cleaned up temporary test data from MongoDB.');
    process.exit(0);
  }
}

runFilterTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
