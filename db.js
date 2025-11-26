const mysql = require("mysql2");

// Normal createConnection (same as your code)
const connection = mysql.createConnection({
    host: "217.21.87.103",
    database: "u205680228_wearzy",
    password: "Sneha3306",
    user: "u205680228_sneha"
});

// Connect as usual
connection.connect(error => {
    if (error) {
        console.log("Database connection error " + error);
    } else {
        console.log("Database connected");
    }
});

// ⬇️ Add promise wrapper here (IMPORTANT)
const db = connection.promise();

module.exports = db;
