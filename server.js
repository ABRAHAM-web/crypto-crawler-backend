const express = require('express');
const app = express();

// Define a simple route
app.get('/', (req, res) => {
    res.send('Hello, Crypto~Crawler!!');
    //res.send(req.header('host'));
});

// Define a simple route
app.post('/ietsie', (req, res) => {
    //res.send('Hello, Crypto~Crawler!!');
    res.send(req.body.raw);
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
