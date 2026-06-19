const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: '99bf0f30-cf3a-48ab-9f1b-0138707cd843', email: 'mela@gmail.com', role: 'owner', store_id: '28b92c0c-8965-4579-8376-63cd451d68e0' }, 'stoka_super_secret_jwt_key_2026');
fetch('http://localhost:4000/api/brands?store_id=28b92c0c-8965-4579-8376-63cd451d68e0', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(console.log).catch(console.error);
