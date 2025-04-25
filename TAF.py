import requests
import json

def fetch_taf_raw(icao_code):
    """Fetch TAF data for an airport code"""
    url = f"https://aviationweather.gov/api/data/taf?ids={icao_code}&format=json"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching TAF: {e}")
        return None

def save_taf_data(data, icao_code):
    """Save TAF data to a JSON file (not used anymore)"""
    filename = f"{icao_code.upper()}_taf.json"
    with open(filename, "w") as file:
        json.dump(data, file, indent=4)
    return filename

if __name__ == "__main__":
    icao = input("Enter ICAO airport code (e.g., KJFK): ").strip().upper()
    taf_data = fetch_taf_raw(icao)
    if taf_data:
        filename = save_taf_data(taf_data, icao)
        print(f"Saved TAF data to {filename}")
    else:
        print("Failed to retrieve TAF data.")
