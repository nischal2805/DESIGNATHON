import requests
import json

def fetch_pirep_raw(icao_code, save_file=True):
    """Fetch PIREP data for an airport code"""
    url = f"https://aviationweather.gov/cgi-bin/data/pirep.php?ids={icao_code.upper()}&format=raw"

    try:
        response = requests.get(url)
        response.raise_for_status()

        raw_data = response.text.strip()

        # Convert to simple JSON format
        output_json = {
            "icao": icao_code.upper(),
            "pireps": raw_data.splitlines()
        }

        # Save to JSON file only if save_file is True
        if save_file:
            filename = f"{icao_code.upper()}_pireps.json"
            with open(filename, 'w') as file:
                json.dump(output_json, file, indent=4)
            print(f"Data saved to {filename}")

        # Return the data regardless
        return output_json

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return None

if __name__ == "__main__":
    user_input = input("Enter ICAO airport code (e.g., KJFK): ")
    fetch_pirep_raw(user_input)
