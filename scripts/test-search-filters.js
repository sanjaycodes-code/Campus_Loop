const http = require('http');

const API_BASE = 'http://localhost:5000/api/listings';

function fetchQuery(queryString = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${queryString}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testFilterEndpoints() {
  console.log('\x1b[36m%s\x1b[0m', '=== Testing GET /api/listings Filter & Search API ===\n');

  const testCases = [
    {
      name: '1. Text search across title and description',
      query: '?search=calculator',
      validate: (data) => data.success && Array.isArray(data.listings),
    },
    {
      name: '2. Category filtering (device)',
      query: '?category=device',
      validate: (data) => data.success && data.listings.every((item) => item.category === 'device'),
    },
    {
      name: '3. Price range filtering (min=10, max=100)',
      query: '?minPrice=10&maxPrice=100',
      validate: (data) =>
        data.success &&
        data.listings.every((item) => item.pricePerDay >= 10 && item.pricePerDay <= 100),
    },
    {
      name: '4. Multi-filter AND combination (category=gadget & isAvailable=true & maxPrice=50)',
      query: '?category=gadget&isAvailable=true&maxPrice=50',
      validate: (data) =>
        data.success &&
        data.listings.every(
          (item) => item.category === 'gadget' && item.isAvailable === true && item.pricePerDay <= 50
        ),
    },
    {
      name: '5. Edge Case: Impossible Price Range (minPrice=200 > maxPrice=10)',
      query: '?minPrice=200&maxPrice=10',
      validate: (data) => data.success && data.count === 0,
    },
    {
      name: '6. Edge Case: Search with special characters (e.g. C++ (Notes))',
      query: '?search=C%2B%2B%20(Notes)',
      validate: (data) => data.success && Array.isArray(data.listings),
    },
  ];

  for (const tc of testCases) {
    try {
      const res = await fetchQuery(tc.query);
      const passed = res.status === 200 && tc.validate(res.data);
      console.log(`${tc.name}`);
      console.log(`   URL: ${tc.query}`);
      console.log(`   Status: ${res.status} | Found: ${res.data.count ?? res.data.total ?? 0}`);
      if (passed) {
        console.log('   \x1b[32m✔ PASS\x1b[0m\n');
      } else {
        console.log('   \x1b[31m✖ FAIL\x1b[0m\n');
      }
    } catch (err) {
      console.log(`   \x1b[31mError testing ${tc.name}: ${err.message}\x1b[0m\n`);
    }
  }

  console.log('\x1b[32m%s\x1b[0m', '=== Filter Endpoint Testing Complete ===\n');
}

testFilterEndpoints();
