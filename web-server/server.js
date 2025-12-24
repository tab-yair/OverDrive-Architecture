const express = require('express');
const app = express();

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const userRoutes = require('./routes/userRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const fileRoutes = require('./routes/fileRoutes');

// Middleware
app.use(express.json());

// Mount routes
app.use('/api/users', userRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/files', fileRoutes);

// 404 handler - catches all unmatched routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler - must be last
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT);
