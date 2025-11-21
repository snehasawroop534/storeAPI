const express = require("express");
const db = require("./db")
const jwt = require("jsonwebtoken");
const multer = require("multer");
const bcrypt = require("bcrypt");
const path = require("path");
const { error } = require("console");
const app = express();

app.use(express.urlencoded({ extended: true }));  
app.use(express.json());


const storage = multer.diskStorage({
    destination:"./productImages",
    filename:(request, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.use("/productImages", express.static("productImages"));

// Post product for admin use

app.post("/api/products/add", upload.single("productimg"), async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ message: "Please upload product image" });
    }

    const { title, brand, mrp, discountedPrice, description } = req.body;
    const filename = req.file.filename;

    try {
        const [result] = await db.query(
            `INSERT INTO products 
            (title, brand, mrp, discountedPrice, description, image)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [title, brand, mrp, discountedPrice, description, filename]
        );

        res.status(201).json({
            message: "Product added successfully",
            product: {
                productId: result.insertId,
                title,
                brand,
                mrp,
                discountedPrice,
                description,
                image: filename
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server internal error" });
    }
});


// get all products

app.get("/api/products", async (request, response) => {
    try {
        const [result] = await db.query("SELECT * FROM products");
        response.status(200).json(result);
    } catch (error) {
        console.error("Error fetching products:", error);
        response.status(500).json({ message: "Server internal error" });
    }
});

// get all products by id 

app.get("/api/products/:id", async (request, response) => {
    const productId = request.params.id;

    try {
        const [result] = await db.query(
            "SELECT * FROM products WHERE productId = ?",
            [productId]
        );

        if (result.length === 0) {
            return response.status(404).json({ message: "Product not found" });
        }

        response.status(200).json(result[0]);
    } catch (error) {
        console.error("Error fetching product:", error);
        response.status(500).json({ message: "Server internal error" });
    }
});

// get categories 


app.get("/api/categories", async (request, response) => {
    try {
        const [result] = await db.query("SELECT * FROM categories");
        response.status(200).json(result);

    } catch (error) {
        console.error("Error fetching categories:", error);
        response.status(500).json({ message: "Internal server error" });
    }
});

// add category

app.post("/api/categories/add", async (request, response) => {
    const { name, slug } = request.body;

    try {
        const [result] = await db.query(
            "INSERT INTO categories (name, slug) VALUES (?, ?)",
            [name, slug]
        );

        response.status(201).json({
            id: result.insertId,
            name,
            slug
        });

    } catch (error) {
        console.error("Error adding category:", error);
        response.status(500).json({ message: "Internal server error" });
    }
});

// get filters

app.get("/api/filters", async (request, response) => {
    try {
        const [result] = await db.query("SELECT * FROM filters LIMIT 1");

        if (result.length === 0) {
            return response.status(404).json({ message: "No filters found" });
        }

        const filters = result[0];
        filters.brands = JSON.parse(filters.brands);
        filters.colors = JSON.parse(filters.colors);
        filters.sizes = JSON.parse(filters.sizes);
        filters.discounts = JSON.parse(filters.discounts);

        response.status(200).json(filters);

    } catch (error) {
        console.error("Error fetching filters:", error);
        response.status(500).json({ message: "Internal server error" });
    }
});

// Add to cart

app.post("/api/cart/add", async (request, response) => {
    const { userId, productId, size, quantity, price } = request.body;

    try {
        const [result] = await db.query(
            `INSERT INTO cart (userId, productId, size, quantity, price)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, productId, size, quantity, price]
        );

        response.status(201).json({
            message: "Item added to cart",
            cartItemId: result.insertId
        });

    } catch (error) {
        console.error("Error adding to cart:", error);
        response.status(500).json({ message: "Internal server error" });
    }
});

// get user cart 

app.get("/api/cart/:userId", async (request, response) => {
    const userId = request.params.userId;

    try {
        const [result] = await db.query("SELECT * FROM cart WHERE userId = ?", [
            userId,
        ]);

        response.status(200).json(result);

    } catch (error) {
        console.error("Error fetching cart:", error);
        response.status(500).json({ message: "Internal server error" });
    }
});



// user register

app.post("/api/user/register", async (request, response) => {
    const name = request.body.name;
    const email = request.body.email;
    const password = request.body.password;

    try {
        const passwordHash = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            "INSERT INTO users(name, email, password) VALUES (?, ?, ?)",
            [name, email, passwordHash]
        );

        response.status(201).json({
            Message: "Register successfully",
            user: {
            name: name,
            email: email
            }
        });

    } catch (error) {
        console.error("Database INSERT error:", error);

        if (error.errno === 1062) {
            return response.status(409).json({
                message: "This email address is already registered."
            });
        }

        return response.status(500).json({
            message: "Server internal error. Could not register user."
        });
    }
});


// user login

app.post("/api/user/login", async (request, response) => {
    const email = request.body.email;
    const password = request.body.password;
    const secretKey = "ghdfjjgi9ew8865w";

    try {
        const [result] = await db.query(
            "SELECT userId, name, email, password FROM users WHERE email=?",
            [email]
        );

        if (result.length === 0) {
            return response.status(401).json({
                message: "Login failed: Invalid email or password."
            });
        }

        const user = result[0];
        const dbPassword = user.password;

        const isPasswordSame = await bcrypt.compare(password, dbPassword);

        if (!isPasswordSame) {
            return response.status(401).json({
                message: "Login failed: Invalid email or password."
            });
        }

        const token = jwt.sign(
            { userId: user.userId, name: user.name, email: user.email },
            secretKey,
            { expiresIn: "1h" }
        );

        response.status(200).json({
            message: "Login successfully",
            token: token,
            
        });

    } catch (error) {
        console.error("Login attempt error:", error);
        return response.status(500).json({
            message: "An internal server error occurred during login."
        });
    }
});


// get all user 

app.get("/api/user", async (request, response) => {
    try {
        const [result] = await db.query("SELECT * FROM users");
        response.status(200).json(result);
    } catch (error) {
        console.error("Fetch users error:", error);
        response.status(500).json({ message: "Server internal error." });
    }
});


// get user only one profile

app.get("/api/user/profile",(request, response)=>{
    const token = request.headers.authorization;
    const secretKey = "ghdfjjgi9ew8865w";

    jwt.verify(token, secretKey,(error, result)=>{
        if(error){
            response.status(400).json({message: "unathorized"})
        }else{
            response.status(200).json({result});
        }
    })
})

app.put("/api/user/profile/update/:userId", async (request, response) => {
    const name = request.body.name;
    const email = request.body.email;
    const userId = request.params.userId;

    try {
        if (!name || !email) {
            return response.status(400).json({
                message: "Name and Email are required",
            });
        }

        const [result] = await db.query(
            "UPDATE users SET name=?, email=? WHERE userId=?",
            [name, email, userId]
        );

        if (result.affectedRows === 0) {
            return response.status(404).json({
                message: "User not found",
            });
        }

        response.status(200).json({
            message: "Data updated successfully",
            name: name,
            email: email,
        });

    } catch (error) {
        console.error("Error updating profile:", error);
        response.status(500).json({
            message: "Internal server error",
        });
    }
});



app.listen(4005, (error)=>{
    if(error) console.log("Error "+ error);
    console.log("Server is running on port 4005");
})


