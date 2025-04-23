const express = require('express');
const router = express.Router();
const path = require('path');

// Serve the main index page
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/index.html'));
});

// Serve the briefing template
router.get('/briefing', (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/templates/briefing.html'));
});

// Serve partials
router.get('/partials/header', (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/partials/header.html'));
});

router.get('/partials/footer', (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/partials/footer.html'));
});

module.exports = router;