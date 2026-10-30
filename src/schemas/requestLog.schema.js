import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

// M2A3 Q1: one row per request the server receives.
export const RequestLog = sequelize.define(
  'RequestLog',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // ISO-8601 text, same format as url_shortner.created_at.
    timestamp: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    method: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Null when the client sends no User-Agent header.
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Null if the connection closed before the address could be read.
    ip: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'request_logs',
    timestamps: false,
  },
);
