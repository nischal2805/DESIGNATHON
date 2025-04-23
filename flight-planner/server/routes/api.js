const express = require('express');
const router = express.Router();
const weatherAPI = require('../services/weatherAPI');
const airportService = require('../services/airportService');

// Route to fetch weather data for a specific airport
router.post('/weather', async (req, res) => {
    const { airportCode } = req.body;

    if (!airportCode) {
        return res.status(400).json({ error: 'Airport code is required' });
    }

    try {
        const weatherData = await weatherAPI.getWeatherData(airportCode);
        res.json(weatherData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

// Route to validate airport codes
router.post('/validate-airport', (req, res) => {
    const { airportCode } = req.body;

    if (!airportCode) {
        return res.status(400).json({ error: 'Airport code is required' });
    }

    const isValid = airportService.validateAirportCode(airportCode);
    res.json({ valid: isValid });
});

module.exports = router;