import React, { useState } from 'react';
import { fetchWeatherData } from '../js/weatherService';
import { validateAirports } from '../js/airportService';
import './flightForm.css';

const FlightForm = ({ onWeatherDataFetched }) => {
    const [airportCodes, setAirportCodes] = useState(['']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (index, value) => {
        const newAirportCodes = [...airportCodes];
        newAirportCodes[index] = value;
        setAirportCodes(newAirportCodes);
    };

    const addAirportInput = () => {
        setAirportCodes([...airportCodes, '']);
    };

    const removeAirportInput = (index) => {
        const newAirportCodes = airportCodes.filter((_, i) => i !== index);
        setAirportCodes(newAirportCodes);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const validAirports = validateAirports(airportCodes);
        if (validAirports.length === 0) {
            setError('Please enter at least one valid airport code.');
            setLoading(false);
            return;
        }

        try {
            const weatherData = await fetchWeatherData(validAirports);
            onWeatherDataFetched(weatherData);
        } catch (err) {
            setError('Error fetching weather data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flight-form">
            <h2>Flight Planning Form</h2>
            {airportCodes.map((code, index) => (
                <div key={index} className="airport-input">
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        placeholder="Enter ICAO code (e.g. KJFK)"
                        required
                    />
                    {airportCodes.length > 1 && (
                        <button type="button" onClick={() => removeAirportInput(index)}>Remove</button>
                    )}
                </div>
            ))}
            <button type="button" onClick={addAirportInput}>Add Airport</button>
            <button type="submit" disabled={loading}>
                {loading ? 'Loading...' : 'Submit'}
            </button>
            {error && <p className="error-message">{error}</p>}
        </form>
    );
};

export default FlightForm;