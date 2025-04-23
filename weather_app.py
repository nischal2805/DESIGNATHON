import os
import json
import requests
import datetime
from flask import Flask, request, jsonify, render_template, redirect, url_for
from PIREP import fetch_pirep_raw
from sigmat import get_sigmet_data

app = Flask(__name__, static_folder='static', template_folder='templates')

def process_with_ollama(data, route_info=None):
    """Process weather data with Ollama - with improvements for token limit handling"""
    route_description = ""
    if route_info:
        route_description = f"Flight Route: {' → '.join(route_info)}\n\n"
    
    # Prepare a more concise version of the data to fit within token limits
    concise_data = {"route": route_info}
    
    # Extract essential PIREP information
    if 'pirep' in data:
        concise_data['pirep'] = {}
        for airport, pireps in data['pirep'].items():
            # For each airport, extract only important fields from PIREPs
            if isinstance(pireps, list):
                concise_data['pirep'][airport] = [
                    extract_important_pirep_info(p) for p in pireps[:10]  # Limit to first 10 PIREPs
                ]
            else:
                concise_data['pirep'][airport] = "No structured PIREP data available"
    
    # Extract essential SIGMET information
    if 'sigmet' in data and 'data' in data['sigmet']:
        sigmets = data['sigmet']['data']
        if isinstance(sigmets, list):
            concise_data['sigmet'] = [
                extract_important_sigmet_info(s) for s in sigmets[:5]  # Limit to first 5 SIGMETs
            ]
        else:
            concise_data['sigmet'] = "No structured SIGMET data available"
    
    prompt = f"""
    You are an aviation weather briefing specialist. Create a well-structured HTML pilot briefing based on this aviation weather data:
    
    {route_description}{json.dumps(concise_data, indent=2)}
    
    IMPORTANT: RESPOND WITH CLEAN HTML ONLY, NO MARKDOWN.
    
    Structure your response with these exact HTML sections:
    <section class="summary">
        <h3>SUMMARY</h3>
        <p>Brief overview of critical conditions in 2-3 sentences.</p>
    </section>
    
    <section class="hazards">
        <h3>HAZARD ALERTS</h3>
        <ul>
            <li>Hazard 1 with severity rating (high/medium/low)</li>
        </ul>
    </section>
    
    <section class="pireps">
        <h3>PILOT REPORTS</h3>
        <ul>
            <li>Important PIREP data with location and altitude</li>
        </ul>
    </section>
    
    <section class="sigmets">
        <h3>SIGNIFICANT METEOROLOGICAL INFORMATION</h3>
        <ul>
            <li>Interpret SIGMETs in practical terms</li>
        </ul>
    </section>
    
    <section class="conditions">
        <h3>FLIGHT CONDITIONS</h3>
        <ul>
            <li>IFR/VFR conditions with numeric values</li>
        </ul>
    </section>
    
    <section class="recommendations">
        <h3>RECOMMENDATIONS</h3>
        <ul>
            <li>Specific flight planning advice</li>
        </ul>
    </section>
    
    Include severity metrics where appropriate (assign low/medium/high severity).
    Use standard aviation terminology and abbreviations familiar to pilots.
    Do not include any markdown formatting, just clean HTML.
    Use data-attribute tags for severity levels in your list items (data-severity="high").
    If no data is available for a section, indicate briefly rather than omitting the section.
    """
    
    try:
        response = requests.post('http://localhost:11434/api/chat',
                               json={
                                   "model": "llama3.1:latest", 
                                   "messages": [{"role": "user", "content": prompt}],
                                   "stream": False,
                                   "options": {"temperature": 0.1, "num_ctx": 4096}  # Increase context window if possible
                               }, timeout=60)  # Increased timeout
        
        if response.status_code == 200:
            return response.json().get('message', {}).get('content', "Error: Unexpected response format")
        else:
            return f"Error: Ollama returned status code {response.status_code}. Response: {response.text}"
    except requests.exceptions.ConnectionError:
        return "Error: Cannot connect to Ollama. Make sure Ollama is running on localhost:11434."
    except requests.exceptions.Timeout:
        return "Error: Request to Ollama timed out. The service might be overwhelmed."
    except Exception as e:
        return f"Error: {str(e)}"

def extract_important_pirep_info(pirep):
    """Extract only the most important info from a PIREP to reduce token count"""
    # This is a placeholder - customize based on your PIREP structure
    if isinstance(pirep, str):
        # Try to extract key info from the PIREP string
        parts = pirep.split()
        return " ".join(parts[:20]) if len(parts) > 20 else pirep
    
    if isinstance(pirep, dict):
        # Extract only essential fields
        essential = {}
        key_fields = ['altitude', 'aircraft_ref', 'location', 'time', 'turbulence', 'icing', 'remarks']
        for field in key_fields:
            if field in pirep:
                essential[field] = pirep[field]
        return essential
    
    return "PIREP data format not recognized"

def extract_important_sigmet_info(sigmet):
    """Extract only the most important info from a SIGMET to reduce token count"""
    # This is a placeholder - customize based on your SIGMET structure
    if isinstance(sigmet, dict):
        # Extract only essential fields
        essential = {}
        key_fields = ['hazard', 'area_affected', 'valid_time_from', 'valid_time_to', 'altitude', 'movement']
        for field in key_fields:
            if field in sigmet:
                essential[field] = sigmet[field]
        return essential
    
    return "SIGMET data format not recognized"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/flight-plan', methods=['GET'])
def flight_plan():
    return render_template('flight_plan.html')

@app.route('/api/route-briefing', methods=['POST'])
def route_briefing():
    data = request.json
    route_input = data.get('airports', '')
    region = data.get('region', 'all')
    hazard = data.get('hazard', 'all')
    
    if not route_input:
        return jsonify({'error': 'No route provided'})
    
    # Parse the route string "KPHX,5000,KBXK,7000,KLVS,8000"
    route_items = route_input.split(',')
    
    airports = []
    altitudes = {}
    
    # Extract airport codes and altitudes from the input
    for i in range(0, len(route_items), 2):
        if i+1 < len(route_items):
            airport = route_items[i].strip().upper()
            try:
                altitude = int(route_items[i+1].strip())
                airports.append(airport)
                altitudes[airport] = altitude
            except (ValueError, IndexError):
                # Handle case where altitude isn't a valid number
                airports.append(airport)
    
    if not airports:
        return jsonify({'error': 'No valid airports provided'})
    
    results = {}
    route_info = []
    
    # Process each airport in the route
    for airport in airports:
        # Add airport with altitude to route info
        altitude_str = f" at {altitudes.get(airport, 'unknown')}ft" if airport in altitudes else ""
        route_info.append(f"{airport}{altitude_str}")
        
        # Fetch PIREP data for each airport
        fetch_pirep_raw(airport)
        filename = f"{airport}_pireps.json"
        if os.path.exists(filename):
            with open(filename, 'r') as f:
                if 'pirep' not in results:
                    results['pirep'] = {}
                
                try:
                    # Extract only the most relevant PIREPs to reduce token count
                    pirep_data = json.load(f)
                    # Limit to most recent 20 PIREPs to reduce token count
                    if isinstance(pirep_data, list) and len(pirep_data) > 20:
                        pirep_data = pirep_data[:20]
                    results['pirep'][airport] = pirep_data
                except json.JSONDecodeError:
                    results['pirep'][airport] = "Invalid PIREP data format"
    
    # Get SIGMET data for the entire route
    sigmet_data, _, _ = get_sigmet_data_modified(region, hazard)
    if sigmet_data:
        current_date = datetime.datetime.now().strftime("%Y%m%d")
        filename = f"SIGMET_{region}_{hazard}_{current_date}.json"
        
        # Create output JSON with metadata but filter to reduce size
        output_json = {
            "region": region,
            "hazard": hazard,
            "timestamp": datetime.datetime.now().isoformat(),
        }
        
        # Only include SIGMETs that might affect the route
        # This filtering helps reduce token count
        if isinstance(sigmet_data, list):
            # Filter SIGMETs to those most relevant to route airports
            filtered_sigmets = sigmet_data[:10]  # Take only first 10 to reduce tokens
            output_json["data"] = filtered_sigmets
        else:
            output_json["data"] = sigmet_data
        
        # Save to JSON file
        with open(filename, 'w') as file:
            json.dump(output_json, file, indent=4)
        
        results['sigmet'] = output_json
    
    if results:
        processed_report = process_with_ollama(results, route_info)
        return jsonify({
            'raw_data': results,
            'report': processed_report,
            'route': route_info
        })
    
    return jsonify({'error': 'No weather data available'})

@app.route('/api/weather', methods=['POST'])
def get_weather():
    data = request.json
    report_type = data.get('type')
    results = {}
    
    if report_type == 'pirep' or report_type == 'both':
        icao_code = data.get('icao')
        if icao_code:
            fetch_pirep_raw(icao_code)
            filename = f"{icao_code.upper()}_pireps.json"
            if os.path.exists(filename):
                with open(filename, 'r') as f:
                    results['pirep'] = json.load(f)
    
    if report_type == 'sigmet' or report_type == 'both':
        # Modify to accept parameters instead of using input()
        if report_type == 'both':
            region = data.get('region', 'all')
            hazard = data.get('hazard', 'all')
            sigmet_data, _, _ = get_sigmet_data_modified(region, hazard)
            if sigmet_data:
                current_date = datetime.datetime.now().strftime("%Y%m%d")
                filename = f"SIGMET_{region}_{hazard}_{current_date}.json"
                
                # Create output JSON with metadata
                output_json = {
                    "region": region,
                    "hazard": hazard,
                    "timestamp": datetime.datetime.now().isoformat(),
                    "data": sigmet_data
                }
                
                # Save to JSON file
                with open(filename, 'w') as file:
                    json.dump(output_json, file, indent=4)
                
                results['sigmet'] = output_json
        else:
            # Original implementation for standalone SIGMET
            sigmet_data, region, hazard = get_sigmet_data()
            if sigmet_data:
                current_date = datetime.datetime.now().strftime("%Y%m%d")
                filename = f"SIGMET_{region}_{hazard}_{current_date}.json"
                if os.path.exists(filename):
                    with open(filename, 'r') as f:
                        results['sigmet'] = json.load(f)
    
    if results:
        processed_report = process_with_ollama(results)
        return jsonify({
            'raw_data': results,
            'report': processed_report
        })
    
    return jsonify({'error': 'No data available'})

def get_sigmet_data_modified(region, hazard):
    """Modified version of get_sigmet_data that accepts parameters instead of using input()"""
    # Construct the API URL
    base_url = "https://aviationweather.gov/api/data/isigmet"
    params = {
        "loc": region,
        "hazard": hazard,
        "format": "json"
    }

    try:
        # Make the GET request
        response = requests.get(base_url, params=params)
        response.raise_for_status()  # Raise an error for bad status codes

        # Parse and return JSON data
        data = response.json()
        return data, region, hazard

    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")
        return None, region, hazard

if __name__ == '__main__':
    app.run(debug=True, port=5000)