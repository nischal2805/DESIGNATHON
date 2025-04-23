import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { fetchWeatherData } from '../js/weatherService';
import { getAirportCoordinates } from '../js/airportService';
import 'leaflet/dist/leaflet.css';

const WeatherMap = ({ route }) => {
    const [weatherData, setWeatherData] = useState(null);
    const [markers, setMarkers] = useState([]);

    useEffect(() => {
        if (route.length > 0) {
            const fetchWeather = async () => {
                const data = await fetchWeatherData(route);
                setWeatherData(data);
                setMarkers(getAirportCoordinates(route));
            };
            fetchWeather();
        }
    }, [route]);

    return (
        <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {markers.map((marker, index) => (
                <Marker key={index} position={marker.coordinates}>
                    <Popup>
                        <strong>{marker.airport}</strong><br />
                        {weatherData && weatherData[marker.airport] ? (
                            <div>
                                <p>Temperature: {weatherData[marker.airport].temperature} °C</p>
                                <p>Condition: {weatherData[marker.airport].condition}</p>
                            </div>
                        ) : (
                            <p>Loading weather data...</p>
                        )}
                    </Popup>
                </Marker>
            ))}
            {markers.length > 1 && (
                <Polyline positions={markers.map(marker => marker.coordinates)} color="blue" />
            )}
        </MapContainer>
    );
};

export default WeatherMap;