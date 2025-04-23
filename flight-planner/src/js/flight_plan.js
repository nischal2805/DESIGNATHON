document.addEventListener('DOMContentLoaded', function() {
    const flightPlanForm = document.getElementById('flight-plan-form');
    const airportInputs = document.getElementById('airport-inputs');
    const loading = document.getElementById('loading');
    const briefingSection = document.getElementById('briefing-section');
    const briefingContent = document.getElementById('briefing-content');
    const routeDisplay = document.getElementById('route-display');
    const themeSwitch = document.getElementById('theme-switch');
    
    let map = L.map('weather-map').setView([40, -95], 4);
    let weatherLayer, routeLayer;
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    themeSwitch.addEventListener('change', function() {
        if (this.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    });
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeSwitch.checked = true;
    }
    
    document.querySelector('.add-airport').addEventListener('click', addAirportInput);
    
    flightPlanForm.addEventListener('submit', function(e) {
        e.preventDefault();
        generateBriefing();
    });
    
    function addAirportInput() {
        const inputs = airportInputs.querySelectorAll('.airport-input');
        const lastInput = inputs[inputs.length - 1];
        
        const newInput = document.createElement('div');
        newInput.className = 'airport-input';
        
        let label;
        if (inputs.length === 1) {
            label = 'En Route';
        } else if (inputs.length === 2) {
            label = 'Arrival';
            inputs[1].querySelector('label').textContent = 'En Route 1';
        } else {
            label = `En Route ${inputs.length - 1}`;
        }
        
        newInput.innerHTML = `
            <label>${label}</label>
            <input type="text" class="airport-code" placeholder="ICAO (e.g. KJFK)" maxlength="4">
            <div class="airport-actions">
                <button type="button" class="add-airport"><i class="fas fa-plus"></i></button>
                <button type="button" class="remove-airport"><i class="fas fa-minus"></i></button>
            </div>
        `;
        
        const addButton = lastInput.querySelector('.add-airport');
        if (addButton) {
            addButton.remove();
        }
        
        airportInputs.appendChild(newInput);
        
        newInput.querySelector('.add-airport').addEventListener('click', addAirportInput);
        newInput.querySelector('.remove-airport').addEventListener('click', function() {
            removeAirportInput(newInput);
        });
        
        newInput.querySelector('.airport-code').focus();
    }
    
    function removeAirportInput(inputElement) {
        const inputs = airportInputs.querySelectorAll('.airport-input');
        if (inputs.length <= 1) {
            return;
        }
        
        inputElement.remove();
        updateLabels();
        
        const inputs2 = airportInputs.querySelectorAll('.airport-input');
        const lastInput = inputs2[inputs2.length - 1];
        
        if (!lastInput.querySelector('.add-airport')) {
            const actionsDiv = lastInput.querySelector('.airport-actions');
            const addButton = document.createElement('button');
            addButton.type = 'button';
            addButton.className = 'add-airport';
            addButton.innerHTML = '<i class="fas fa-plus"></i>';
            addButton.addEventListener('click', addAirportInput);
            actionsDiv.prepend(addButton);
        }
    }
    
    function updateLabels() {
        const inputs = airportInputs.querySelectorAll('.airport-input');
        
        inputs.forEach((input, index) => {
            const label = input.querySelector('label');
            if (index === 0) {
                label.textContent = 'Departure';
            } else if (index === inputs.length - 1) {
                label.textContent = 'Arrival';
            } else {
                label.textContent = `En Route ${index}`;
            }
        });
    }
    
    function generateBriefing() {
        const airportInputElements = document.querySelectorAll('.airport-code');
        const airports = Array.from(airportInputElements).map(input => input.value.trim().toUpperCase());
        
        const validAirports = airports.filter(airport => airport !== '');
        
        if (validAirports.length === 0) {
            alert('Please enter at least one airport ICAO code');
            return;
        }
        
        const region = document.getElementById('region').value;
        const hazard = document.getElementById('hazard').value;
        
        loading.style.display = 'flex';
        briefingSection.style.display = 'none';
        
        document.getElementById('summary-content').innerHTML = '';
        document.getElementById('hazards-content').innerHTML = '';
        document.getElementById('pireps-content').innerHTML = '';
        document.getElementById('sigmets-content').innerHTML = '';
        document.getElementById('conditions-content').innerHTML = '';
        document.getElementById('recommendations-content').innerHTML = '';
        
        fetch('/api/route-briefing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                airports: validAirports,
                region: region,
                hazard: hazard
            })
        })
        .then(response => response.json())
        .then(data => {
            loading.style.display = 'none';
            
            if (data.error) {
                alert(data.error);
                return;
            }
            
            displayRoute(data.route);
            updateWeatherMap(data);
            parseBriefingContent(data.report);
            briefingSection.style.display = 'block';
            briefingSection.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            loading.style.display = 'none';
            alert('Error generating briefing: ' + error.message);
        });
    }
    
    function displayRoute(airports) {
        routeDisplay.innerHTML = '';
        
        airports.forEach((airport, index) => {
            const airportChip = document.createElement('div');
            airportChip.className = 'airport-chip';
            airportChip.textContent = airport;
            routeDisplay.appendChild(airportChip);
            
            if (index < airports.length - 1) {
                const arrow = document.createElement('div');
                arrow.className = 'route-arrow';
                arrow.innerHTML = '<i class="fas fa-arrow-right"></i>';
                routeDisplay.appendChild(arrow);
            }
        });
    }
    
    function parseBriefingContent(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        const summarySection = doc.querySelector('.summary') || doc.querySelector('section:nth-child(1)');
        if (summarySection) {
            document.getElementById('summary-content').innerHTML = summarySection.innerHTML;
        }
        
        const hazardsSection = doc.querySelector('.hazards') || doc.querySelector('section:nth-child(2)');
        if (hazardsSection) {
            document.getElementById('hazards-content').innerHTML = hazardsSection.innerHTML;
        }
        
        const pirepsSection = doc.querySelector('.pireps') || doc.querySelector('section:nth-child(3)');
        if (pirepsSection) {
            document.getElementById('pireps-content').innerHTML = pirepsSection.innerHTML;
        }
        
        const sigmetsSection = doc.querySelector('.sigmets') || doc.querySelector('section:nth-child(4)');
        if (sigmetsSection) {
            document.getElementById('sigmets-content').innerHTML = sigmetsSection.innerHTML;
        }
        
        const conditionsSection = doc.querySelector('.conditions') || doc.querySelector('section:nth-child(5)');
        if (conditionsSection) {
            document.getElementById('conditions-content').innerHTML = conditionsSection.innerHTML;
        }
        
        const recommendationsSection = doc.querySelector('.recommendations') || doc.querySelector('section:nth-child(6)');
        if (recommendationsSection) {
            document.getElementById('recommendations-content').innerHTML = recommendationsSection.innerHTML;
        }
        
        applySeverityStyling();
    }
    
    function applySeverityStyling() {
        const allListItems = document.querySelectorAll('.tile-content li');
        
        allListItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            
            if (item.hasAttribute('data-severity')) {
                return;
            }
            
            if (text.includes('severe') || 
                text.includes('dangerous') || 
                text.includes('extreme') ||
                text.includes('warning') ||
                text.includes('hazardous')) {
                item.setAttribute('data-severity', 'high');
            } else if (text.includes('moderate') || 
                       text.includes('caution') ||
                       text.includes('potential')) {
                item.setAttribute('data-severity', 'medium');
            } else if (text.includes('light') || 
                       text.includes('minor') ||
                       text.includes('good condition') ||
                       text.includes('favorable')) {
                item.setAttribute('data-severity', 'low');
            }
        });
    }
    
    function updateWeatherMap(data) {
        if (weatherLayer) {
            map.removeLayer(weatherLayer);
        }
        
        if (routeLayer) {
            map.removeLayer(routeLayer);
        }
        
        const airportCoordinates = {
            'KJFK': [40.6413, -73.7781],
            'KLAX': [33.9416, -118.4085],
            'KORD': [41.9742, -87.9073],
            'KATL': [33.6407, -84.4277],
            'KDFW': [32.8998, -97.0403],
            'KLGA': [40.7769, -73.8740],
            'KBOS': [42.3656, -71.0096],
            'KSFO': [37.6213, -122.3790],
            'KDEN': [39.8561, -104.6737],
            'KMIA': [25.7932, -80.2906],
        };
        
        const routeCoords = [];
        const bounds = [];
        let hasValidCoords = false;
        
        data.route.forEach(airport => {
            if (airportCoordinates[airport]) {
                routeCoords.push(airportCoordinates[airport]);
                bounds.push(airportCoordinates[airport]);
                hasValidCoords = true;
            }
        });
        
        if (!hasValidCoords) {
            map.setView([39.8, -98.5], 4);
            return;
        }
        
        const markers = [];
        data.route.forEach(airport => {
            if (airportCoordinates[airport]) {
                const marker = L.marker(airportCoordinates[airport])
                    .bindPopup(`<b>${airport}</b><br>Click for weather details`)
                    .addTo(map);
                markers.push(marker);
            }
        });
        
        if (routeCoords.length >= 2) {
            routeLayer = L.polyline(routeCoords, {
                color: '#3498db',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 10',
                lineCap: 'round'
            }).addTo(map);
        }
        
        if (bounds.length > 0) {
            map.fitBounds(bounds, {
                padding: [50, 50]
            });
        }
        
        try {
            if (data.raw_data && data.raw_data.sigmet && data.raw_data.sigmet.data) {
                const sigmets = data.raw_data.sigmet.data;
                
                sigmets.forEach(sigmet => {
                    if (sigmet.geom && sigmet.geom.coordinates && sigmet.geom.coordinates.length > 0) {
                        try {
                            const coords = sigmet.geom.coordinates[0].map(coord => [coord[1], coord[0]]);
                            
                            L.polygon(coords, {
                                color: '#e74c3c',
                                fillOpacity: 0.3,
                                weight: 2
                            }).addTo(map)
                            .bindPopup(`<b>SIGMET</b><br>${sigmet.raw_text || 'Weather hazard area'}`);
                        } catch (e) {
                            console.log('Error creating SIGMET polygon:', e);
                        }
                    }
                });
            }
        } catch (e) {
            console.log('Error processing weather data for map:', e);
        }
    }
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.style.display !== 'none' && map) {
                map.invalidateSize();
            }
        });
    });
    
    observer.observe(briefingSection, { attributes: true, attributeFilter: ['style'] });
});