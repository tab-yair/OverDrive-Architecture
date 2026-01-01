// Load environment variables
require('dotenv').config();

const express = require('express');
const app = express();

const { errorHandler } = require('./middleware/errorHandler');
const userRoutes = require('./routes/userRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const fileRoutes = require('./routes/fileRoutes');
const searchRoutes = require('./routes/searchRoutes');

// size limit increased to handle large JSON payloads
app.use(express.json({ limit: '50mb' }));

// Middleware to handle JSON syntax errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Bad JSON received from client/terminal');
        return res.status(400).json({ error: "Invalid JSON format. Check your quotes and commas." });
    }
    next();
});

// log all incoming requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Mount routes
app.use('/api/users', userRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/search', searchRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Web Server running on port ${PORT}`);
});