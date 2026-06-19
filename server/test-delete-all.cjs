const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: '99bf0f30-cf3a-48ab-9f1b-0138707cd843', email: 'mela@gmail.com', role: 'owner', store_id: '28b92c0c-8965-4579-8376-63cd451d68e0' }, 'stoka_super_secret_jwt_key_2026');

async function testDel(id) {
  const r = await fetch(`http://localhost:4000/api/products/${id}?store_id=28b92c0c-8965-4579-8376-63cd451d68e0`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`id ${id}:`, r.status, await r.text());
}

async function run() {
  await testDel(1);
  await testDel(2);
  await testDel(3);
  await testDel(4);
  await testDel('undefined');
}
run();
