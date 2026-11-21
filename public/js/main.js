const weatherForm = document.getElementById("weather-form");
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const statusMessage = document.getElementById("status-message");
const weatherResult = document.getElementById("weather-result");
const weatherVisual = document.getElementById("weather-visual");
const suggestionsContainer = document.getElementById("location-suggestions");

const cityName = document.getElementById("city-name");
const countryName = document.getElementById("country-name");
const temperature = document.getElementById("temperature");
const weatherDescription = document.getElementById("weather-description");
const feelsLike = document.getElementById("feels-like");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("wind-speed");
const conditionSummary = document.getElementById("condition-summary");
const weatherInsight = document.getElementById("weather-insight");

let selectedLocation = null;
let searchTimer = null;
let searchRequestNumber = 0;

cityInput.addEventListener("input", () => {
    selectedLocation = null;

    clearTimeout(searchTimer);

    const city = cityInput.value.trim();

    if (city.length < 2) {
        hideSuggestions();
        return;
    }

    searchTimer = setTimeout(() => {
        searchLocationSuggestions(city);
    }, 400);
});

async function searchLocationSuggestions(city) {
    const requestNumber = ++searchRequestNumber;

    try {
        const response = await fetch(
            `/api/weather/locations?city=${encodeURIComponent(city)}`
        );

        const result = await response.json();

        if (requestNumber !== searchRequestNumber) {
            return;
        }

        if (!response.ok || !result.success) {
            hideSuggestions();
            return;
        }

        renderSuggestions(result.data);

    } catch (error) {
        console.error("Location suggestions error:", error);
        hideSuggestions();
    }
}

function renderSuggestions(locations) {
    suggestionsContainer.replaceChildren();

    if (!locations || locations.length === 0) {
        hideSuggestions();
        return;
    }

    locations.forEach((location) => {
        const option = document.createElement("button");

        option.type = "button";
        option.className = "location-option";
        option.setAttribute("role", "option");

        const name = document.createElement("strong");
        name.textContent = location.name;

        const details = document.createElement("span");
        details.textContent = [
            location.region,
            location.country
        ].filter(Boolean).join(", ");

        option.append(name, details);

        option.addEventListener("click", () => {
            selectedLocation = location;
            cityInput.value = location.name;
            hideSuggestions();

            showMessage(
                `Selected: ${location.name}, ${location.country}. Click Get Weather.`
            );
        });

        suggestionsContainer.appendChild(option);
    });

    suggestionsContainer.hidden = false;
}

function hideSuggestions() {
    suggestionsContainer.hidden = true;
    suggestionsContainer.replaceChildren();
}

document.addEventListener("click", (event) => {
    if (
        !weatherForm.contains(event.target) &&
        !suggestionsContainer.contains(event.target)
    ) {
        hideSuggestions();
    }
});

weatherForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const city = cityInput.value.trim();

    if (!city) {
        showMessage("Please enter a city name.");
        return;
    }

    clearTimeout(searchTimer);
    hideSuggestions();

    searchButton.disabled = true;
    searchButton.textContent = "Loading...";
    weatherResult.hidden = true;

    try {
        let location = selectedLocation;

        if (!location) {
            showMessage("Finding your location...");

            const locationResponse = await fetch(
                `/api/weather/locations?city=${encodeURIComponent(city)}`
            );

            const locationResult = await locationResponse.json();

            if (!locationResponse.ok || !locationResult.success) {
                throw new Error(
                    locationResult.message || "Unable to search for this location."
                );
            }

            const locations = locationResult.data;

            if (locations.length === 0) {
                showMessage("City Not Found. Please check the spelling and try again.");
                return;
            }

            if (locations.length > 1) {
                renderSuggestions(locations);
                showMessage("Several locations match. Please select the correct city and country.");
                return;
            }

            location = locations[0];
        }

        showMessage("Fetching weather information...");

        const params = new URLSearchParams({
            latitude: location.latitude,
            longitude: location.longitude,
            city: location.name,
            region: location.region || "",
            country: location.country
        });

        const response = await fetch(`/api/weather?${params.toString()}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Unable to retrieve weather information."
            );
        }

        displayWeather(result.data);
        selectedLocation = location;
        showMessage("");

    } catch (error) {
        console.error("Weather search error:", error);
        showMessage(
            error.message || "Something went wrong. Please try again."
        );
    } finally {
        searchButton.disabled = false;
        searchButton.textContent = "Search";
    }
});

function displayWeather(weather) {
    cityName.textContent = weather.city;

    countryName.textContent = [
        weather.region,
        weather.country
    ].filter(Boolean).join(", ");

    temperature.textContent = `${weather.temperature}°C`;
    weatherDescription.textContent = weather.description;

    feelsLike.textContent = `${weather.feelsLike}°C`;
    humidity.textContent = `${weather.humidity}%`;
    windSpeed.textContent = `${weather.windSpeed} km/h`;

    conditionSummary.textContent = weather.description;

    weatherInsight.textContent = getWeatherInsight(
        weather.weatherCode,
        weather.temperature,
        weather.humidity,
        weather.windSpeed
    );

    updateWeatherVisual(weather.weatherCode, weather.temperature);

    weatherResult.hidden = false;
}

function updateWeatherVisual(weatherCode, currentTemperature) {
    let condition = "clear";

    if ([1, 2].includes(weatherCode)) {
        condition = "partly-cloudy";
    } else if (weatherCode === 3) {
        condition = "cloudy";
    } else if ([45, 48].includes(weatherCode)) {
        condition = "fog";
    } else if (
        (weatherCode >= 51 && weatherCode <= 67) ||
        (weatherCode >= 80 && weatherCode <= 82)
    ) {
        condition = "rain";
    } else if (
        (weatherCode >= 71 && weatherCode <= 77) ||
        [85, 86].includes(weatherCode)
    ) {
        condition = "snow";
    } else if (weatherCode >= 95 && weatherCode <= 99) {
        condition = "storm";
    }

    let temperatureEffect = "";

    if (currentTemperature >= 30) {
        temperatureEffect = "temperature-hot";
    } else if (currentTemperature < 16) {
        temperatureEffect = "temperature-cold";
    }

    weatherVisual.className =
        `weather-visual condition-${condition} ${temperatureEffect}`;
}

function showMessage(message) {
    statusMessage.textContent = message;
}

function getWeatherInsight(code, temp, humidityValue, wind) {
    if (code >= 95) {
        return "Thunderstorms are currently reported. Stay sheltered during lightning and heavy rain.";
    }

    if (code >= 51 && code <= 82) {
        return "Rain or showers are currently reported. Consider carrying an umbrella when heading outside.";
    }

    if (code >= 71 && code <= 86) {
        return "Snow is currently reported. Dress warmly and take care on slippery surfaces.";
    }

    if (temp >= 30) {
        return "It is currently hot. Stay hydrated and consider taking breaks in shaded areas.";
    }

    if (humidityValue >= 75) {
        return "Humidity is currently high, which may make the air feel warmer than the temperature suggests.";
    }

    if (wind >= 25) {
        return "Winds are currently strong. Take care around exposed outdoor areas.";
    }

    return "Current conditions are " + weatherDescriptionText(code) +
        ". Check the weather details above to plan your day.";
}

function weatherDescriptionText(code) {
    if (code === 0) return "clear";
    if (code === 1 || code === 2) return "partly cloudy";
    if (code === 3) return "overcast";
    if (code === 45 || code === 48) return "foggy";
    return "changing";
}
