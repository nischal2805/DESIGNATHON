const axios = require('axios');

const WEATHER_API_URL = 'https://api.weatherapi.com/v1/current.json'; // Replace with your weather API endpoint
const API_KEY = 'YOUR_API_KEY'; // Replace with your actual API key

async function getWeatherData(airportCode) {
    try {
        const response = await axios.get(WEATHER_API_URL, {
            params: {
                key: API_KEY,
                q: airportCode,
                aqi: 'no' // Adjust based on your needs
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        throw new Error('Unable to fetch weather data');
    }
}

module.exports = {
    getWeatherData
};