const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Serve static files like CSS if needed
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to serve mappings data as JSON
app.get('/api/mappings', (req, res) => {
  try {
    const mappings = JSON.parse(fs.readFileSync('mappings.json', 'utf-8'));
    res.json(mappings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load mappings' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
