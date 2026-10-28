import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

// M2A2 Q5: users who own short codes, identified by their api_key.
export const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    api_key: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    // literal() makes this a database default, so rows inserted with plain
    // SQL get a timestamp too, not only rows created through Sequelize.
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
  },
  {
    tableName: 'users',
    timestamps: false,
  },
);

// Creates the table if it is missing; an existing table is left untouched.
await User.sync();

// Returns the user with this api_key, or null if there is none.
export async function findByApiKey(apiKey) {
  if (!apiKey) return null;
  const row = await User.findOne({ where: { api_key: apiKey }, raw: true });
  return row ?? null;
}
