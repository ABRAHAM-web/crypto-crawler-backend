const express = require('express');
const db = require('./database'); // This connects to your MySQL database

const app = express();
app.use(express.json()); // Middleware to parse incoming JSON data

// Root route (optional)
app.get('/', (req, res) => {
    res.send('Welcome to the Crypto~Crawler API 🚀');
});

// 🔹 User Registration Endpoint
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

app.post('/register', async (req, res) => {
    const { full_name, surname, email, password } = req.body;

    if (!full_name || !surname || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const sql = 'INSERT INTO users (full_name, surname, email, password) VALUES (?, ?, ?, ?)';
        db.query(sql, [full_name, surname, email, hashedPassword], (err, result) => {
            if (err) {
                console.error('MySQL insert error:', err);
                return res.status(500).json({ error: err.message });
            }

            res.json({ message: 'User registered successfully!', userId: result.insertId });
        });
    } catch (error) {
        console.error('Hashing error:', error);
        res.status(500).json({ error: "Server error during registration" });
    }
});


// Login route
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = results[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        res.json({ message: "Login successful!", userId: user.id });
    });
});

// Add a commodity for a user
app.post('/commodities', (req, res) => {
    const { user_id, name, crypto_symbol, amount, purchase_price } = req.body;

    // Basic validation
    if (!user_id || !crypto_symbol || !amount || !purchase_price) {
        return res.status(400).json({ error: "user_id, crypto_symbol, amount, and purchase_price are required" });
    }

    const sql = `
        INSERT INTO commodities (user_id, name, crypto_symbol, amount, purchase_price)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [user_id, name || null, crypto_symbol.toUpperCase(), amount, purchase_price], (err, result) => {
        if (err) {
            console.error('Error inserting commodity:', err);
            return res.status(500).json({ error: err.message });
        }

        res.json({
            message: "Commodity added successfully!",
            commodityId: result.insertId
        });
    });
});


// Start the server
const PORT = 4000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
