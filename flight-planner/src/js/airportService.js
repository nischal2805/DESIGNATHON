// This file manages airport-related data, including fetching airport information and validating user input against a list of known airports.

const airportData = require('../static/data/airports.json');

export function getAirportInfo(icaoCode) {
    const airport = airportData.find(airport => airport.icao === icaoCode.toUpperCase());
    return airport || null;
}

export function validateAirportCode(icaoCode) {
    return airportData.some(airport => airport.icao === icaoCode.toUpperCase());
}

export function getAllAirports() {
    return airportData.map(airport => airport.icao);
}