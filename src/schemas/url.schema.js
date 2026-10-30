import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { User } from './user.schema.js';

// Sequelize version of the url_shortner table that db.js creates with SQL.
export const Url = sequelize.define(
  'Url',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    original_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    short_code: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    // Stored as ISO-8601 text ("2026-10-08T17:30:31Z") to match the rows the
    // raw-SQL version wrote, rather than Sequelize's own DATE format.
    created_at: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // M2A2 Q3: how many times /redirect was called for this code, and when
    // it was last called (null until the first visit).
    click_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_accessed_at: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // M2A2 Q5: owner of the short code (null for codes created without an api_key).
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: User, key: 'id' },
    },
    // M2A2 Q8: after this time /redirect returns 410 (null = never expires).
    expires_at: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // M2A2 Q14: optional password as "salt:hash" (null = no password).
    password_hash: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'url_shortner',
    timestamps: false,
    // Same name as the index db.js creates, so sync() sees it as existing.
    indexes: [{ name: 'idx_url_shortner_created_at', fields: ['created_at'] }],
  },
);
