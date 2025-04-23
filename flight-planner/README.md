# Flight Planner Application

## Overview
The Flight Planner application is a dynamic web application designed to assist users in planning flights by processing real user input for any airport. It displays real-time weather data and incorporates animations for a better user experience.

## Features
- **User Input**: Allows users to input airport codes and generate flight plans.
- **Real-Time Weather Data**: Fetches and displays current weather conditions for the specified airports.
- **Dynamic Animations**: Utilizes an animation package to enhance user interactions and data updates.
- **Responsive Design**: Ensures a seamless experience across various devices.

## Project Structure
```
flight-planner
├── src
│   ├── js
│   │   ├── flight_plan.js
│   │   ├── animations.js
│   │   ├── mapUtils.js
│   │   ├── weatherService.js
│   │   └── airportService.js
│   ├── css
│   │   ├── main.css
│   │   ├── dark-theme.css
│   │   └── animations.css
│   └── components
│       ├── flightForm.js
│       ├── weatherMap.js
│       ├── briefingTiles.js
│       └── routeDisplay.js
├── static
│   ├── img
│   │   └── icons
│   └── data
│       └── airports.json
├── server
│   ├── index.js
│   ├── routes
│   │   ├── api.js
│   │   └── views.js
│   └── services
│       ├── weatherAPI.js
│       └── briefingGenerator.js
├── views
│   ├── index.html
│   ├── partials
│   │   ├── header.html
│   │   └── footer.html
│   └── templates
│       └── briefing.html
├── package.json
├── .gitignore
├── webpack.config.js
└── README.md
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd flight-planner
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage
1. Start the server:
   ```
   npm start
   ```
2. Open your browser and navigate to `http://localhost:3000` to access the application.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.