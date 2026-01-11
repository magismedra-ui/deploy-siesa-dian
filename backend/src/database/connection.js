const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'conciliacion_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'rootpassword',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async (retries = 10, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('MySQL connected successfully via Sequelize');
      // En producción, usar migraciones en lugar de sync
      await sequelize.sync({ alter: false }); 
      return;
    } catch (error) {
      console.error(`DB Error (attempt ${i + 1}/${retries}):`, error.message);
      
      if (i < retries - 1) {
        console.log(`Retrying connection in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('Failed to connect to MySQL after all retries');
        console.error('Full error:', error);
        process.exit(1);
      }
    }
  }
};

module.exports = { sequelize, connectDB };

