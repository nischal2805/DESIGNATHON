const express = require('express');
const weatherAPI = require('./weatherAPI');
const airportService = require('../airportService');

const router = express.Router();

// Generate flight briefing based on user input
router.post('/generate-briefing', async (req, res) => {
    const { airports, region, hazard } = req.body;

    // Validate airport codes
    const validAirports = airports.filter(airport => airportService.isValidAirport(airport));
    
    if (validAirports.length === 0) {
        return res.status(400).json({ error: 'No valid airport codes provided.' });
    }

    try {
        // Fetch weather data for the valid airports
        const weatherData = await weatherAPI.fetchWeatherData(validAirports);
        
        // Generate briefing content based on weather data and user input
        const briefingContent = generateBriefingContent(weatherData, region, hazard);
        
        res.json({ report: briefingContent, route: validAirports });
    } catch (error) {
        console.error('Error generating briefing:', error);
        res.status(500).json({ error: 'Failed to generate briefing.' });
    }
});

// Function to generate briefing content
function generateBriefingContent(weatherData, region, hazard) {
    // Logic to create a structured briefing report based on weather data
    // This can include summaries, hazards, recommendations, etc.
    
    let report = '<div class="summary">Flight Briefing Summary</div>';
    
    // Add weather data to the report
    report += '<div class="weather-data">';
    weatherData.forEach(data => {
        report += `<p>${data.airport}: ${data.weather}</p>`;
    });
    report += '</div>';
    
    // Add region and hazard information
    report += `<div class="region">Region: ${region}</div>`;
    report += `<div class="hazard">Hazard: ${hazard}</div>`;
    
    return report;
}

module.exports = router;