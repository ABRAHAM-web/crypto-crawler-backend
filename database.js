const mysql = require('mysql2');
require('dotenv').config(); // Load variables from .env
const util = require('util');

// Create MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'cryptoadmin',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'cryptocrawler'
});

db.query = util.promisify(db.query); 

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('❌ MySQL Connection Failed:', err.message);
    } else {
        console.log('✅ Connected to MySQL Database');
    }
});

module.exports = db;
