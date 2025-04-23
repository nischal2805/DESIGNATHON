const API_KEY = 'YOUR_API_KEY'; // Replace with your actual API key
const BASE_URL = 'https://api.weatherapi.com/v1/current.json';

export async function fetchWeatherData(airportCode) {
    try {
        const response = await fetch(`${BASE_URL}?key=${API_KEY}&q=${airportCode}`);
        if (!response.ok) {
            throw new Error('Failed to fetch weather data');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        throw error;
    }
}

export function formatWeatherData(weatherData) {
    if (!weatherData || !weatherData.current) {
        throw new Error('Invalid weather data');
    }

    return {
        temperature: weatherData.current.temp_c,
        condition: weatherData.current.condition.text,
        wind: weatherData.current.wind_kph,
        humidity: weatherData.current.humidity,
        icon: weatherData.current.condition.icon,
    };
}