
const axios = require('axios');

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

// Create a new commodity (inactive by default)
app.post('/commodities', (req, res) => {
    const { user_id, name } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
    }

    const sql = `
        INSERT INTO commodities (user_id, name, status)
        VALUES (?, ?, 'inactive')
    `;

    db.query(sql, [user_id, name || null], (err, result) => {
        if (err) {
            console.error('Error creating commodity:', err);
            return res.status(500).json({ error: err.message });
        }

        res.json({
            message: "Commodity created successfully (inactive)",
            commodityId: result.insertId
        });
    });
});


app.post('/commodities/:id/purchase', async (req, res) => {
    const commodityId = req.params.id;
    const { crypto_symbol, amount, purchase_price } = req.body;

    if (!crypto_symbol || !amount || !purchase_price) {
        return res.status(400).json({ error: "crypto_symbol, amount, and purchase_price are required" });
    }

    try {
        // Step 1: Update the commodity to mark it as "bought"
        const updateSql = `
            UPDATE commodities
            SET crypto_symbol = ?, amount = ?, purchase_price = ?, status = 'bought'
            WHERE id = ? AND status = 'inactive'
        `;

        db.query(updateSql, [crypto_symbol.toUpperCase(), amount, purchase_price, commodityId], async (err, result) => {
            if (err) {
                console.error('Error updating commodity:', err);
                return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Commodity not found or already purchased" });
            }

            try {
                // Step 2: Fetch top 30 coins from CoinGecko
                const { data: top30 } = await axios.get(
                    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1'
                );

                // Step 3: Insert volume movement entries
                const insertSql = `
                    INSERT INTO volume_movement (commodity_id, crypto_name, volume)
                    VALUES (?, ?, ?)
                `;

                const insertTasks = top30.map((coin) => {
                    const coinName = coin.id;
                    const price = coin.current_price;
                    const volume = purchase_price / price;

                    return new Promise((resolve, reject) => {
                        db.query(insertSql, [commodityId, coinName, volume], (err) => {
                            if (err) {
                                console.error('Error inserting volume_movement:', err);
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                });

                await Promise.all(insertTasks);

                res.json({ message: "Commodity activated and top 30 volumes captured successfully!" });

            } catch (error) {
                console.error("Error during CoinGecko call or DB insert:", error);
                res.status(500).json({ error: "Failed to fetch top 30 or insert volume data" });
            }
        });
    } catch (error) {
        console.error('Server error during purchase:', error.message);
        res.status(500).json({ error: "Unexpected server error" });
    }
});

// Start the server
const PORT = 4000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
