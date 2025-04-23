// This file provides utility functions for managing the map display, including setting up map layers, markers, and handling user interactions with the map.

import L from 'leaflet';

// Initialize the map with default settings
export function initializeMap(containerId) {
    const map = L.map(containerId).setView([40, -95], 4);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    return map;
}

// Add a marker to the map
export function addMarker(map, coordinates, popupContent) {
    const marker = L.marker(coordinates).addTo(map);
    if (popupContent) {
        marker.bindPopup(popupContent);
    }
    return marker;
}

// Create a polyline for the route
export function createRoute(map, routeCoordinates) {
    return L.polyline(routeCoordinates, {
        color: '#3498db',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10',
        lineCap: 'round'
    }).addTo(map);
}

// Fit the map to the bounds of the given coordinates
export function fitMapToBounds(map, bounds) {
    if (bounds.length > 0) {
        map.fitBounds(bounds, {
            padding: [50, 50]
        });
    }
}

// Clear all layers from the map
export function clearMapLayers(map) {
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
}