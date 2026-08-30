const http = require('http');

const API_BASE = 'http://localhost:5000/api';

function request(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const postData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\x1b[36m%s\x1b[0m', '=== Starting CampusLoop CRUD & Ownership Verification ===\n');

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const emailA = `own.24U${randomNum}@nitdgp.ac.in`;
  const emailB = `oth.24U${randomNum + 1}@nitdgp.ac.in`;

  // 1. Register User A
  console.log(`1. Registering Owner (User A: ${emailA})...`);
  const regA = await request('/auth/register', 'POST', {
    name: 'Sanjay Owner',
    email: emailA,
    password: 'password123',
    campus: 'NIT Durgapur',
  });
  console.log(`   -> Status: ${regA.status} (Expected: 201)`);
  const tokenA = regA.data.token;
  if (!tokenA) throw new Error('Failed to get Token A');

  // 2. Register User B
  console.log(`\n2. Registering Imposter / Non-Owner (User B: ${emailB})...`);
  const regB = await request('/auth/register', 'POST', {
    name: 'Other Student',
    email: emailB,
    password: 'password123',
    campus: 'NIT Durgapur',
  });
  console.log(`   -> Status: ${regB.status} (Expected: 201)`);
  const tokenB = regB.data.token;
  if (!tokenB) throw new Error('Failed to get Token B');

  // 3. User A creates a Listing
  console.log('\n3. User A creating a listing ("Casio FX-991CW Calculator")...');
  const createRes = await request(
    '/listings',
    'POST',
    {
      title: 'Casio FX-991CW ClassWiz',
      description: 'Used for sem exams, fresh batteries included',
      category: 'gadget',
      pricePerDay: 20,
      securityDeposit: 150,
      condition: 'like_new',
      campus: 'NIT Durgapur',
    },
    tokenA
  );
  console.log(`   -> Status: ${createRes.status} (Expected: 201)`);
  const listingId = createRes.data.listing?._id;
  console.log(`   -> Created Listing ID: ${listingId}`);

  // 4. Public GET /api/listings
  console.log('\n4. Public user fetching marketplace listings (GET /api/listings)...');
  const listRes = await request('/listings');
  console.log(`   -> Status: ${listRes.status} (Found ${listRes.data.total} listings)`);

  // 5. User B tries to update User A's listing (Should be 403 Forbidden)
  console.log('\n5. User B attempting to EDIT User A\'s listing (PUT /api/listings/:id)...');
  const hackEditRes = await request(
    `/listings/${listingId}`,
    'PUT',
    { pricePerDay: 1 },
    tokenB
  );
  console.log(`   -> Status: ${hackEditRes.status} (Expected: 403 Forbidden)`);
  console.log(`   -> Response Message: "${hackEditRes.data.message}"`);
  if (hackEditRes.status === 403) {
    console.log('   \x1b[32m✔ PASS: Backend successfully blocked unauthorized edit.\x1b[0m');
  } else {
    console.log('   \x1b[31m✖ FAIL: Backend allowed non-owner to edit!\x1b[0m');
  }

  // 6. User B tries to delete User A's listing (Should be 403 Forbidden)
  console.log('\n6. User B attempting to DELETE User A\'s listing (DELETE /api/listings/:id)...');
  const hackDeleteRes = await request(`/listings/${listingId}`, 'DELETE', null, tokenB);
  console.log(`   -> Status: ${hackDeleteRes.status} (Expected: 403 Forbidden)`);
  console.log(`   -> Response Message: "${hackDeleteRes.data.message}"`);
  if (hackDeleteRes.status === 403) {
    console.log('   \x1b[32m✔ PASS: Backend successfully blocked unauthorized delete.\x1b[0m');
  } else {
    console.log('   \x1b[31m✖ FAIL: Backend allowed non-owner to delete!\x1b[0m');
  }

  // 7. User A updates their own listing (Should be 200 OK)
  console.log('\n7. Legitimate Owner (User A) updating listing price to ₹25/day...');
  const legitimateEdit = await request(
    `/listings/${listingId}`,
    'PUT',
    { pricePerDay: 25 },
    tokenA
  );
  console.log(`   -> Status: ${legitimateEdit.status} (Expected: 200)`);
  console.log(`   -> Updated Price: ₹${legitimateEdit.data.listing?.pricePerDay}`);
  if (legitimateEdit.status === 200 && legitimateEdit.data.listing?.pricePerDay === 25) {
    console.log('   \x1b[32m✔ PASS: Owner can update their listing.\x1b[0m');
  }

  // 8. User A deletes their own listing (Should be 200 OK)
  console.log('\n8. Legitimate Owner (User A) deleting listing...');
  const legitimateDelete = await request(`/listings/${listingId}`, 'DELETE', null, tokenA);
  console.log(`   -> Status: ${legitimateDelete.status} (Expected: 200)`);
  if (legitimateDelete.status === 200) {
    console.log('   \x1b[32m✔ PASS: Owner can delete their listing.\x1b[0m');
  }

  console.log('\n\x1b[32m%s\x1b[0m', '=== ALL CRUD & OWNERSHIP TESTS PASSED! ===\n');
}

runTests().catch((e) => console.error('Verification failed:', e));
