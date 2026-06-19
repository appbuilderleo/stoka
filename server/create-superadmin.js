import { pool } from './db.js';
import bcrypt from 'bcryptjs';

async function createSuperAdmin() {
  const email = 'superadmin@stoka.co.mz';
  const password = 'SuperPassword123!';
  const fullName = 'Stoka Super Admin';

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Verifique se já existe
    const exist = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
    if (exist.rows.length > 0) {
      console.log('Super Admin já existe!');
      // Atualiza a password caso já exista
      await pool.query('UPDATE profiles SET password_hash = $1, role = $2 WHERE email = $3', [passwordHash, 'superadmin', email]);
      console.log('Password atualizada para: ' + password);
      return;
    }

    await pool.query(
      `INSERT INTO profiles (email, password_hash, full_name, role) 
       VALUES ($1, $2, $3, $4)`,
      [email, passwordHash, fullName, 'superadmin']
    );

    console.log('Super Admin criado com sucesso!');
    console.log('Email: ' + email);
    console.log('Password: ' + password);

  } catch (err) {
    console.error('Erro ao criar Super Admin:', err);
  } finally {
    await pool.end();
  }
}

createSuperAdmin();
