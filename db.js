const mysql = require("mysql2/promise");
require("dotenv").config();

const poolConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true, // If connections are maxed out, queue new requests
    connectionLimit: 10,     // Max number of simultaneous connections (adjust as needed)
    queueLimit: 0,           // No limit on the queue for waiting requests
    connectTimeout: 20000, 
    acquireTimeout: 20000 
};

const db = mysql.createPool(poolConfig);

db.getConnection()
    .then(connection => {
        console.log("Database connected and pool ready.");
        connection.release(); // Release the test connection back to the pool
    })
    .catch(error => {
        console.error("Database connection error (Please check config/credentials):", error.message);
    });

module.exports = db;