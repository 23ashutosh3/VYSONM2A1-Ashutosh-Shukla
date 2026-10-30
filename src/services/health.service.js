import { sequelize } from '../sequelize.js';

// M2A2 Q16: authenticate() runs a test query, so this is false if the
// database cannot be reached.
export async function isDatabaseUp() {
  try {
    await sequelize.authenticate();
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}
