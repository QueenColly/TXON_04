# WeatherNow – Weather Search Application

WeatherNow is a full-stack weather search application built with Node.js, Express.js, HTML, CSS and JavaScript.

It allows users to search for cities, select matching locations and view current weather information using the Open-Meteo API.

## Features

- Search for cities and locations.
- Display location suggestions while typing.
- Select a city and country from matching results.
- Retrieve current weather information.
- Display temperature and feels-like temperature.
- Display humidity and wind speed.
- Show weather descriptions and animated weather visuals.
- Handle invalid searches and API errors.
- Responsive weather dashboard.

## Technologies Used

**Frontend:** HTML5, CSS3, JavaScript, Fetch API and async/await.

**Backend:** Node.js, Express.js and Open-Meteo APIs.

**Testing:** Jest and Supertest.

## API Endpoints

### Search Locations

`GET /api/weather/locations?city=Lagos`

Returns matching locations for the supplied city name.

### Retrieve Current Weather

`GET /api/weather?latitude=6.52&longitude=3.37&city=Lagos&country=Nigeria`

Returns current weather information for the selected location.

Required parameters: latitude, longitude, city and country.

## Automated Testing

Run `npm test` to execute the Jest and Supertest test suite.

The tests cover successful weather retrieval, coordinate validation, location searches, missing input and external API errors.

## Weather Data Provider

Weather data and location information are provided by [Open-Meteo](https://open-meteo.com/).

## Internship Project

Developed as Week 4 of the TXON Full Stack Development Internship.

## Author

**QueenColly**

GitHub: https://github.com/QueenColly
