import requests
import json

def fetch_metar_raw(icao_code):
    """Fetch METAR data for an airport code"""
    url = f"https://aviationweather.gov/api/data/metar?ids={icao_code}&format=json"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"METAR fetch error: {e}")
        return None

def save_metar_data(data, icao_code):
    """Save METAR data to a JSON file (not used anymore)"""
    filename = f"{icao_code.upper()}_metar.json"
    with open(filename, 'w') as file:
        json.dump(data, file, indent=4)
    return filename

if __name__ == '__main__':
    icao_code = input("Enter ICAO airport code (e.g., KJFK): ").strip().upper()
    metar_data = fetch_metar_raw(icao_code)
    if metar_data:
        filename = save_metar_data(metar_data, icao_code)
        print(f"METAR data saved to {filename}")
    else:
        print("Failed to retrieve METAR data.")
