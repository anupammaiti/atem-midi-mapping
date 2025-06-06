const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Serve static files (e.g., CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Serve mappings.json as JSON API
app.get('/api/mappings', (req, res) => {
  const filePath = path.join(__dirname, 'mappings.json');
  try {
    const mappings = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log('✅ /api/mappings requested');
    res.json(mappings);
  } catch (err) {
    console.error('❌ Failed to read mappings.json:', err);
    res.status(500).json({ error: 'Failed to load mappings' });
  }
});

// Serve index.html on root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
