import requests
import json
import datetime

def get_sigmet_data():
    # Prompt user for input
    region = input("Enter Code (e.g., namer, eur, asia, all): ").strip()
    hazard = input("Enter hazard type (e.g., all, conv, turb, ice, ash): ").strip()

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
        return None, None, None

# Example usage
if __name__ == "__main__":
    sigmet_data, region, hazard = get_sigmet_data()
    if sigmet_data:
        # Create a filename based on the query parameters and current date
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
        
        print(f"Data saved to {filename}")
