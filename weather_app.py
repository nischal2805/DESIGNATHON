import os
import json
import requests
import datetime
from flask import Flask, request, jsonify, render_template, redirect, url_for, session
from PIREP import fetch_pirep_raw
from sigmat import get_sigmet_data
from METAR import fetch_metar_raw
from TAF import fetch_taf_raw

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'aviation_briefing_secret_key'  # Needed for session

# In-memory cache for briefings (alternative to file storage)
briefing_cache = {}

def process_data_with_ollama(data_type, data, route_info=None):
    """Process a specific type of weather data with Ollama"""
    route_description = ""
    if route_info:
        route_description = f"Flight Route: {' → '.join(route_info)}\n\n"
    
    # Create a prompt specific to the data type
    if data_type == "pirep":
        prompt = f"""
        You are an aviation weather specialist. Analyze these Pilot Reports (PIREPs) and create a concise HTML summary:
        
        {route_description}{json.dumps(data, indent=2)}
        
        Focus on turbulence, icing, cloud tops, and visibility reports.
        Format your response as clean HTML with severity ratings (high/medium/low).
        Use data-attribute tags for severity levels in your list items (data-severity="high").
        Keep your response under 500 words to ensure it fits within token limits.
        """
    elif data_type == "sigmet":
        prompt = f"""
        You are an aviation weather specialist. Analyze these SIGMETs and create a concise HTML summary:
        
        {route_description}{json.dumps(data, indent=2)}
        
        Interpret SIGMETs in practical terms for pilots with clear hazard descriptions.
        Format your response as clean HTML with severity ratings (high/medium/low).
        Use data-attribute tags for severity levels in your list items (data-severity="high").
        Keep your response under 500 words to ensure it fits within token limits.
        """
    elif data_type == "metar":
        prompt = f"""
        You are an aviation weather specialist. Analyze these METAR reports and create a concise HTML summary:
        
        {route_description}{json.dumps(data, indent=2)}
        
        Focus on ceiling, visibility, wind, and any special conditions.
        Format your response as clean HTML with IFR/MVFR/VFR classifications.
        Use data-attribute tags for flight conditions in your list items (data-condition="IFR").
        Keep your response under 500 words to ensure it fits within token limits.
        """
    elif data_type == "taf":
        prompt = f"""
        You are an aviation weather specialist. Analyze these TAF forecasts and create a concise HTML summary:
        
        {route_description}{json.dumps(data, indent=2)}
        
        Focus on forecast changes, expected conditions, and timing.
        Format your response as clean HTML with time periods clearly marked.
        Keep your response under 500 words to ensure it fits within token limits.
        """
    elif data_type == "summary":
        prompt = f"""
        You are an aviation weather briefing specialist. Create a well-structured HTML pilot briefing based on these pre-analyzed aviation weather components:
        
        {route_description}
        
        PIREP Analysis: {data.get('pirep', 'No PIREP data available')}
        
        SIGMET Analysis: {data.get('sigmet', 'No SIGMET data available')}
        
        METAR Analysis: {data.get('metar', 'No METAR data available')}
        
        TAF Analysis: {data.get('taf', 'No TAF data available')}
        
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
        Use data-attribute tags for severity levels in your list items (data-severity="high").
        """
    
    try:
        response = requests.post('http://localhost:11434/api/chat',
                              json={
                                  "model": "llama3.1:latest", 
                                  "messages": [{"role": "user", "content": prompt}],
                                  "stream": False,
                                  "options": {"temperature": 0.1, "num_ctx": 4096}
                              }, timeout=60)
        
        if response.status_code == 200:
            return response.json().get('message', {}).get('content', f"Error: Unexpected response format for {data_type}")
        else:
            return f"Error processing {data_type}: Ollama returned status code {response.status_code}."
    except requests.exceptions.ConnectionError:
        return f"Error processing {data_type}: Cannot connect to Ollama. Make sure Ollama is running on localhost:11434."
    except requests.exceptions.Timeout:
        return f"Error processing {data_type}: Request to Ollama timed out."
    except Exception as e:
        return f"Error processing {data_type}: {str(e)}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/flight-plan', methods=['GET'])
def flight_plan():
    return render_template('flight_plan.html')

@app.route('/flight-briefing/<route_id>', methods=['GET'])
def flight_briefing(route_id):
    """Display detailed briefing from cache instead of files"""
    if route_id in briefing_cache:
        briefing = briefing_cache[route_id]
        return render_template('flight_briefing.html', briefing=briefing)
    else:
        return redirect('/flight-plan')

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
                airports.append(airport)
    
    if not airports:
        return jsonify({'error': 'No valid airports provided'})
    
    results = {
        "pirep": {},
        "sigmet": {},
        "metar": {},
        "taf": {}
    }
    
    route_info = []
    
    # Process each airport in the route
    for airport in airports:
        # Add airport with altitude to route info
        altitude_str = f" at {altitudes.get(airport, 'unknown')}ft" if airport in altitudes else ""
        route_info.append(f"{airport}{altitude_str}")
        
        # Fetch PIREP data - NO FILE SAVING
        pirep_data = fetch_pirep_raw(airport, save_file=False)
        if pirep_data:
            if isinstance(pirep_data, list) and len(pirep_data) > 20:
                pirep_data = pirep_data[:20]
            results['pirep'][airport] = pirep_data
        
        # Fetch METAR data - NO FILE SAVING
        metar_data = fetch_metar_raw(airport)
        if metar_data:
            results['metar'][airport] = metar_data
        
        # Fetch TAF data - NO FILE SAVING
        taf_data = fetch_taf_raw(airport)
        if taf_data:
            results['taf'][airport] = taf_data
    
    # Get SIGMET data for the entire route - NO FILE SAVING
    sigmet_data, _, _ = get_sigmet_data_modified(region, hazard)
    if sigmet_data:
        output_json = {
            "region": region,
            "hazard": hazard,
            "timestamp": datetime.datetime.now().isoformat(),
        }
        
        if isinstance(sigmet_data, list):
            filtered_sigmets = sigmet_data[:10]  # Take only first 10 to reduce tokens
            output_json["data"] = filtered_sigmets
        else:
            output_json["data"] = sigmet_data
        
        results['sigmet'] = output_json
    
    # Process each data type separately and then combine
    component_analyses = {}
    if results:
        # Process PIREPs
        if results['pirep']:
            pirep_prompt = process_data_with_ollama("pirep", results['pirep'], route_info)
            component_analyses['pirep'] = f"<div class='formatted-analysis'>{pirep_prompt}</div>"
        
        # Process SIGMETs
        if results['sigmet']:
            sigmet_prompt = process_data_with_ollama("sigmet", results['sigmet'], route_info)
            component_analyses['sigmet'] = f"<div class='formatted-analysis'>{sigmet_prompt}</div>"
        
        # Process METARs
        if results['metar']:
            metar_prompt = process_data_with_ollama("metar", results['metar'], route_info)
            component_analyses['metar'] = f"<div class='formatted-analysis'>{metar_prompt}</div>"
        
        # Process TAFs
        if results['taf']:
            taf_prompt = process_data_with_ollama("taf", results['taf'], route_info)
            component_analyses['taf'] = f"<div class='formatted-analysis'>{taf_prompt}</div>"
        
        # Generate final combined report
        final_report = process_data_with_ollama("summary", component_analyses, route_info)
        
        # Generate a unique ID for this briefing
        route_id = f"route_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Store in memory cache instead of file
        briefing_cache[route_id] = {
            'route_info': route_info,
            'raw_data': results,
            'component_analyses': component_analyses,
            'final_report': final_report
        }
        
        # Clean older entries if cache gets too big (keep last 10)
        if len(briefing_cache) > 10:
            oldest_key = sorted(briefing_cache.keys())[0]
            del briefing_cache[oldest_key]
        
        return jsonify({
            'raw_data': results,
            'component_analyses': component_analyses,
            'report': final_report,
            'route': route_info,
            'route_id': route_id
        })
    
    return jsonify({'error': 'No weather data available'})

def get_sigmet_data_modified(region, hazard):
    """Modified version of get_sigmet_data that accepts parameters instead of using input()"""
    base_url = "https://aviationweather.gov/api/data/isigmet"
    params = {
        "loc": region,
        "hazard": hazard,
        "format": "json"
    }

    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status()

        data = response.json()
        return data, region, hazard

    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")
        return None, region, hazard

if __name__ == '__main__':
    app.run(debug=True, port=5000)