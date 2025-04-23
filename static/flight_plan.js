document.addEventListener('DOMContentLoaded', function() {
    const flightPlanForm = document.getElementById('flight-plan-form');
    const routeInput = document.getElementById('route-input');
    const loading = document.getElementById('loading');
    const briefingSection = document.getElementById('briefing-section');
    const routeDisplay = document.getElementById('route-display');
    const themeSwitch = document.getElementById('theme-switch');
    
    // Global airport database
    let airportDatabase = {};
    let flightProfile = null;
    
    // Initialize map with a default view
    let map = L.map('weather-map').setView([39.8, -98.5], 4);
    let weatherLayer, routeLayer, hazardLayers = [], markers = [];
    
    // Add Weather radar overlay
    const weatherOverlay = L.tileLayer('https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2', {
        maxZoom: 19,
        opacity: 0.5
    });
    
    // Setup the map with OpenStreetMap tiles
    const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Dark mode tiles
    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    });
    
    // Fetch airport database on load
    fetch('https://raw.githubusercontent.com/mwgg/Airports/master/airports.json')
        .then(response => response.json())
        .then(data => {
            airportDatabase = data;
            console.log('Airport database loaded successfully');
        })
        .catch(error => {
            console.error('Error loading airport database:', error);
            alert('Could not load airport database. Some features may be limited.');
        });
    
    // Theme toggle functionality
    themeSwitch.addEventListener('change', function() {
        if (this.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
            
            // Switch to dark map
            map.removeLayer(baseLayer);
            darkLayer.addTo(map);
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
            
            // Switch to light map
            map.removeLayer(darkLayer);
            baseLayer.addTo(map);
        }
    });
    
    // Check for saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeSwitch.checked = true;
        map.removeLayer(baseLayer);
        darkLayer.addTo(map);
    }
    
    // Submit form
    flightPlanForm.addEventListener('submit', function(e) {
        e.preventDefault();
        generateBriefing();
    });
    
    function generateBriefing() {
        // Get route input
        const routeString = routeInput.value.trim();
        
        if (!routeString) {
            alert('Please enter your route with altitudes');
            return;
        }
        
        // Parse the route string (e.g. KPHX,5000,KBXK,7000,KLVS,8000)
        const routeItems = routeString.split(',');
        const airports = [];
        const altitudes = {};
        
        for (let i = 0; i < routeItems.length; i += 2) {
            if (i + 1 < routeItems.length) {
                const airport = routeItems[i].trim().toUpperCase();
                const altitude = parseInt(routeItems[i + 1].trim(), 10);
                
                if (!isNaN(altitude)) {
                    airports.push(airport);
                    altitudes[airport] = altitude;
                }
            }
        }
        
        if (airports.length === 0) {
            alert('Please enter valid airport codes and altitudes');
            return;
        }
        
        // Get SIGMET options
        const region = document.getElementById('region').value;
        const hazard = document.getElementById('hazard').value;
        
        // Show loading
        loading.style.display = 'flex';
        briefingSection.style.display = 'none';
        
        // Make API request
        fetch('/api/route-briefing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                airports: routeString,
                region: region,
                hazard: hazard
            })
        })
        .then(response => response.json())
        .then(data => {
            // Hide loading
            loading.style.display = 'none';
            
            if (data.error) {
                alert(data.error);
                return;
            }
            
            // Display the route
            displayRoute(data.route, airports, altitudes);
            
            // Display the flight altitude profile
            displayFlightProfile(airports, altitudes);
            
            // Display the map with weather data
            updateWeatherMap(airports, altitudes);
            
            // Parse and display the briefing in tiles
            parseBriefingContent(data.report);
            
            // Show the briefing section
            briefingSection.style.display = 'block';
            
            // Scroll to briefing
            briefingSection.scrollIntoView({ behavior: 'smooth' });
            
            // Add weather animation
            addWeatherAnimation(data);
        })
        .catch(error => {
            loading.style.display = 'none';
            alert('Error generating briefing: ' + error.message);
        });
    }
    
    function displayRoute(routeInfo, airports, altitudes) {
        routeDisplay.innerHTML = '';
        
        airports.forEach((airport, index) => {
            // Add airport chip with info
            const airportChip = document.createElement('div');
            airportChip.className = 'airport-chip';
            
            // Get airport name from database
            const airportName = airportDatabase[airport] ? 
                              (airportDatabase[airport].name || airport) : 
                              airport;
            
            // Add altitude
            const altitude = altitudes[airport] || 'Unknown';
            
            airportChip.innerHTML = `
                <span class="airport-code">${airport}</span>
                <span class="airport-altitude">${altitude} ft</span>
                <span class="airport-name">${airportName}</span>
            `;
            routeDisplay.appendChild(airportChip);
            
            // Add arrow if not the last airport
            if (index < airports.length - 1) {
                const arrow = document.createElement('div');
                arrow.className = 'route-arrow';
                arrow.innerHTML = '<i class="fas fa-arrow-right"></i>';
                routeDisplay.appendChild(arrow);
            }
        });
    }
    
    function displayFlightProfile(airports, altitudes) {
        const profileContainer = document.getElementById('flight-profile');
        
        // Create canvas element
        profileContainer.innerHTML = '<canvas id="altitude-chart"></canvas>';
        
        const labels = airports.map(airport => {
            return airportDatabase[airport] ? 
                `${airport} (${airportDatabase[airport].name || 'Unknown'})` : 
                airport;
        });
        
        const altitudeData = airports.map(airport => altitudes[airport] || 0);
        
        // Create the chart
        const ctx = document.getElementById('altitude-chart').getContext('2d');
        
        // Destroy previous chart if exists
        if (flightProfile) {
            flightProfile.destroy();
        }
        
        flightProfile = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Flight Altitude (ft)',
                    data: altitudeData,
                    fill: false,
                    borderColor: '#3498db',
                    tension: 0.1,
                    pointBackgroundColor: '#2c3e50',
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Altitude (feet)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Route Points'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Altitude: ${context.parsed.y} ft`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    function parseBriefingContent(htmlContent) {
        // First, clean up the input HTML to handle different formats
        const cleanedHtml = htmlContent
            .replace(/```html|```/g, '')  // Remove any markdown code indicators
            .trim();
        
        // Parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(cleanedHtml, 'text/html');
        
        // Extract and place each section into its corresponding tile
        const summarySection = doc.querySelector('.summary') || doc.querySelector('section:nth-child(1)');
        if (summarySection) {
            document.getElementById('summary-content').innerHTML = summarySection.innerHTML || summarySection.textContent;
        }
        
        const hazardsSection = doc.querySelector('.hazards') || doc.querySelector('section:nth-child(2)');
        if (hazardsSection) {
            document.getElementById('hazards-content').innerHTML = hazardsSection.innerHTML || hazardsSection.textContent;
        }
        
        const pirepsSection = doc.querySelector('.pireps') || doc.querySelector('section:nth-child(3)');
        if (pirepsSection) {
            document.getElementById('pireps-content').innerHTML = pirepsSection.innerHTML || pirepsSection.textContent;
        }
        
        const sigmetsSection = doc.querySelector('.sigmets') || doc.querySelector('section:nth-child(4)');
        if (sigmetsSection) {
            document.getElementById('sigmets-content').innerHTML = sigmetsSection.innerHTML || sigmetsSection.textContent;
        }
        
        const conditionsSection = doc.querySelector('.conditions') || doc.querySelector('section:nth-child(5)');
        if (conditionsSection) {
            document.getElementById('conditions-content').innerHTML = conditionsSection.innerHTML || conditionsSection.textContent;
        }
        
        const recommendationsSection = doc.querySelector('.recommendations') || doc.querySelector('section:nth-child(6)');
        if (recommendationsSection) {
            document.getElementById('recommendations-content').innerHTML = recommendationsSection.innerHTML || recommendationsSection.textContent;
        }
        
        // Apply severity styling to list items
        applySeverityStyling();
        
        // Add click listeners to make tiles expandable
        addExpandableTileListeners();
    }
    
    function applySeverityStyling() {
        const allListItems = document.querySelectorAll('.tile-content li');
        const keywordMap = {
            high: ['severe', 'dangerous', 'extreme', 'warning', 'hazardous', 'significant', 'heavy', 'high'],
            medium: ['moderate', 'caution', 'potential', 'deteriorating', 'advisory', 'developing'],
            low: ['light', 'minor', 'good condition', 'favorable', 'clear', 'calm', 'minimal', 'low']
        };
        
        allListItems.forEach(item => {
            // Skip if already styled
            if (item.hasAttribute('data-severity')) return;
            
            const text = item.textContent.toLowerCase();
            
            // Check for explicit severity mentions
            if (text.includes('severity: high') || text.includes('(high)')) {
                item.setAttribute('data-severity', 'high');
            } else if (text.includes('severity: medium') || text.includes('(medium)')) {
                item.setAttribute('data-severity', 'medium');
            } else if (text.includes('severity: low') || text.includes('(low)')) {
                item.setAttribute('data-severity', 'low');
            } else {
                // Check for keyword matches
                for (const [severity, keywords] of Object.entries(keywordMap)) {
                    for (const keyword of keywords) {
                        if (text.includes(keyword)) {
                            item.setAttribute('data-severity', severity);
                            break;
                        }
                    }
                    if (item.hasAttribute('data-severity')) break;
                }
            }
        });
    }
    
    function addExpandableTileListeners() {
        document.querySelectorAll('.tile-header').forEach(header => {
            header.addEventListener('click', () => {
                const tile = header.closest('.tile');
                tile.classList.toggle('expanded');
            });
        });
    }
    
    function updateWeatherMap(airports, altitudes) {
        // Clear existing markers and layers
        if (markers.length > 0) {
            markers.forEach(marker => map.removeLayer(marker));
            markers = [];
        }
        
        if (routeLayer) {
            map.removeLayer(routeLayer);
        }
        
        hazardLayers.forEach(layer => map.removeLayer(layer));
        hazardLayers = [];
        
        // Get coordinates for all airports in the route
        const routeCoordinates = [];
        const bounds = [];
        
        airports.forEach(code => {
            if (airportDatabase[code]) {
                const airport = airportDatabase[code];
                if (airport.lat && airport.lon) {
                    const coords = [airport.lat, airport.lon];
                    routeCoordinates.push(coords);
                    bounds.push(coords);
                    
                    // Create marker with custom popup that includes altitude
                    const marker = createAirportMarker(airport, code, altitudes[code]);
                    markers.push(marker);
                }
            }
        });
        
        // If we have a route with multiple points, draw a line
        if (routeCoordinates.length >= 2) {
            routeLayer = L.polyline(routeCoordinates, {
                color: '#3498db',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 10',
                lineCap: 'round'
            }).addTo(map);
        }
        
        // If we have bounds, zoom to fit them
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
            
            // Add weather overlay for the area
            fetchWeatherForRoute(bounds);
        } else {
            map.setView([39.8, -98.5], 4);
        }
    }
    
    function createAirportMarker(airport, code, altitude) {
        const coords = [airport.lat, airport.lon];
        
        // Create custom icon with altitude indicator
        const altitudeText = altitude ? `${altitude} ft` : 'N/A';
        const markerIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="airport-marker" data-code="${code}" title="${altitudeText}">
                     <i class="fas fa-plane"></i>
                   </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        // Create and add marker
        const marker = L.marker(coords, {icon: markerIcon}).addTo(map);
        
        // Create popup content with altitude
        const popupContent = `
            <div class="airport-popup">
                <h3>${code} - ${airport.name}</h3>
                <p><strong>Location:</strong> ${airport.city || 'N/A'}, ${airport.country || 'N/A'}</p>
                <p><strong>Elevation:</strong> ${airport.elevation || 'N/A'} ft</p>
                <p><strong>Cruise Altitude:</strong> ${altitudeText}</p>
                <div class="weather-loading" id="weather-${code}">Loading weather...</div>
            </div>
        `;
        
        // Add popup
        marker.bindPopup(popupContent);
        
        // Add event listener to fetch weather when popup opens
        marker.on('popupopen', () => {
            fetchAirportWeather(code, coords);
        });
        
        return marker;
    }
    
    function fetchAirportWeather(code, coords) {
        const weatherElement = document.getElementById(`weather-${code}`);
        
        if (!weatherElement) return;
        
        // Fetch current weather from OpenWeatherMap
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${coords[0]}&lon=${coords[1]}&units=metric&appid=9de243494c0b295cca9337e1e96b00e2`)
            .then(response => response.json())
            .then(data => {
                if (data.main && data.weather) {
                    // Calculate wind direction
                    let windDirection = '';
                    if (data.wind) {
                        const deg = data.wind.deg;
                        if (deg >= 337.5 || deg < 22.5) windDirection = 'N';
                        else if (deg >= 22.5 && deg < 67.5) windDirection = 'NE';
                        else if (deg >= 67.5 && deg < 112.5) windDirection = 'E';
                        else if (deg >= 112.5 && deg < 157.5) windDirection = 'SE';
                        else if (deg >= 157.5 && deg < 202.5) windDirection = 'S';
                        else if (deg >= 202.5 && deg < 247.5) windDirection = 'SW';
                        else if (deg >= 247.5 && deg < 292.5) windDirection = 'W';
                        else if (deg >= 292.5 && deg < 337.5) windDirection = 'NW';
                    }
                    
                    // Convert meters/sec to knots
                    const windSpeedKnots = data.wind ? Math.round(data.wind.speed * 1.94384) : 'N/A';
                    
                    // Calculate visibility in nautical miles
                    const visibilityNM = data.visibility ? (data.visibility / 1852).toFixed(1) : 'N/A';
                    
                    // Format weather info for aviation
                    weatherElement.innerHTML = `
                        <div class="weather-info">
                            <p><strong>Conditions:</strong> ${data.weather[0].main}</p>
                            <p><strong>Temperature:</strong> ${Math.round(data.main.temp)}°C</p>
                            <p><strong>Wind:</strong> ${windDirection} ${windSpeedKnots}kt</p>
                            <p><strong>Visibility:</strong> ${visibilityNM} NM</p>
                            <p><strong>Pressure:</strong> ${Math.round(data.main.pressure)} hPa</p>
                        </div>
                        <div class="weather-icon">
                            <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="${data.weather[0].description}">
                        </div>
                    `;
                } else {
                    weatherElement.textContent = "Weather data unavailable";
                }
            })
            .catch(error => {
                console.error('Error fetching airport weather:', error);
                weatherElement.textContent = "Error loading weather data";
            });
    }
    
    function fetchWeatherForRoute(bounds) {
        // Add weather radar overlay
        weatherOverlay.addTo(map);
        
        // Fetch potential hazards along the route
        fetchWeatherHazards(bounds);
    }
    
    function fetchWeatherHazards(bounds) {
        // Calculate the bounding box
        const lats = bounds.map(coord => coord[0]);
        const lons = bounds.map(coord => coord[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        
        // Add padding to the bounding box
        const latPadding = (maxLat - minLat) * 0.2;
        const lonPadding = (maxLon - minLon) * 0.2;
        
        const bbox = {
            minLat: minLat - latPadding,
            maxLat: maxLat + latPadding,
            minLon: minLon - lonPadding,
            maxLon: maxLon + lonPadding
        };
        
        // Fetch thunderstorm data from OpenWeatherMap
        fetch(`https://api.openweathermap.org/data/2.5/box/city?bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat},10&appid=9de243494c0b295cca9337e1e96b00e2`)
            .then(response => response.json())
            .then(data => {
                if (data.list && data.list.length > 0) {
                    data.list.forEach(city => {
                        // Check for thunderstorms, heavy rain, or other conditions
                        if (city.weather && city.weather[0]) {
                            const condition = city.weather[0].id;
                            
                            // Thunderstorm: 200-299, Heavy rain: 500-531
                            if (condition < 300 || (condition >= 500 && condition <= 531)) {
                                const hazardIcon = L.divIcon({
                                    className: 'weather-hazard-icon',
                                    html: condition < 300 ? 
                                        '<i class="fas fa-bolt hazard-thunder"></i>' : 
                                        '<i class="fas fa-cloud-showers-heavy hazard-rain"></i>',
                                    iconSize: [30, 30]
                                });
                                
                                const hazardMarker = L.marker([city.coord.lat, city.coord.lon], {
                                    icon: hazardIcon
                                }).bindPopup(`<b>Weather Hazard</b><br>${city.weather[0].main} near ${city.name}`);
                                
                                hazardLayers.push(hazardMarker);
                                hazardMarker.addTo(map);
                            }
                        }
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching weather hazards:', error);
            });
    }
    
    function addWeatherAnimation(data) {
        // Find the weather conditions tile
        const conditionsContent = document.getElementById('conditions-content');
        
        if (!conditionsContent) return;
        
        // Get a general idea of the weather based on the content
        const content = conditionsContent.textContent.toLowerCase();
        
        // Create animation container
        const animationContainer = document.createElement('div');
        animationContainer.className = 'weather-animation';
        
        // Determine which animation to show based on content keywords
        let animationType = 'clear';
        
        if (content.includes('thunderstorm') || content.includes('lightning')) {
            animationType = 'thunderstorm';
        } else if (content.includes('snow') || content.includes('freezing')) {
            animationType = 'snow';
        } else if (content.includes('rain') || content.includes('shower')) {
            animationType = 'rain';
        } else if (content.includes('fog') || content.includes('mist') || content.includes('visibility reduced')) {
            animationType = 'fog';
        } else if (content.includes('cloud') || content.includes('overcast')) {
            animationType = 'cloudy';
        }
        
        // Create animation HTML based on type
        switch (animationType) {
            case 'thunderstorm':
                animationContainer.innerHTML = `
                    <div class="weather-scene thunderstorm">
                        <div class="cloud"></div>
                        <div class="cloud"></div>
                        <div class="lightning"></div>
                        <div class="rain"></div>
                    </div>
                `;
                break;
            case 'rain':
                animationContainer.innerHTML = `
                    <div class="weather-scene rain">
                        <div class="cloud"></div>
                        <div class="rain"></div>
                    </div>
                `;
                break;
            case 'snow':
                animationContainer.innerHTML = `
                    <div class="weather-scene snow">
                        <div class="cloud"></div>
                        <div class="snowflakes"></div>
                    </div>
                `;
                break;
            case 'fog':
                animationContainer.innerHTML = `
                    <div class="weather-scene fog">
                        <div class="fog-container"></div>
                    </div>
                `;
                break;
            case 'cloudy':
                animationContainer.innerHTML = `
                    <div class="weather-scene cloudy">
                        <div class="cloud"></div>
                        <div class="cloud"></div>
                    </div>
                `;
                break;
            default:
                animationContainer.innerHTML = `
                    <div class="weather-scene clear">
                        <div class="sun"></div>
                    </div>
                `;
        }
        
        // Find the hazards tile and also add visual indicator if hazards exist
        const hazardsContent = document.getElementById('hazards-content');
        if (hazardsContent && hazardsContent.textContent.trim() !== '' && !hazardsContent.textContent.includes('No hazards')) {
            const hazardAnimation = document.createElement('div');
            hazardAnimation.className = 'hazard-indicator';
            hazardAnimation.innerHTML = '<i class="fas fa-exclamation-triangle pulse"></i>';
            
            // Find the hazards tile header
            const hazardsTile = hazardsContent.closest('.tile');
            if (hazardsTile) {
                const hazardsHeader = hazardsTile.querySelector('.tile-header');
                if (hazardsHeader) {
                    hazardsHeader.appendChild(hazardAnimation);
                }
            }
        }
        
        // Add the weather animation to the page
        const summaryTile = document.getElementById('summary-content');
        if (summaryTile) {
            summaryTile.prepend(animationContainer);
        }
    }
    
    // Handle map resize when it becomes visible
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.style.display !== 'none' && map) {
                map.invalidateSize();
            }
        });
    });
    
    observer.observe(briefingSection, { attributes: true, attributeFilter: ['style'] });
});