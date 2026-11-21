
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";

const LOCATION_CACHE_TTL = 24 * 60 * 60 * 1000;
const WEATHER_CACHE_TTL = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

const cache = new Map();
const pendingRequests = new Map();

const weatherDescriptions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail"
};

class WeatherServiceError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.name = "WeatherServiceError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

async function fetchJson(url) {
    const { stdout } = await execFileAsync(
        "curl",
        [
            "-4",
            "--silent",
            "--show-error",
            "--max-time",
            "20",
            "--write-out",
            "\n%{http_code}",
            url
        ],
        {
            timeout: 25000,
            maxBuffer: 1024 * 1024
        }
    );

    const separatorIndex = stdout.lastIndexOf("\n");

    if (separatorIndex === -1) {
        throw new Error("Invalid response from the weather provider");
    }

    const responseBody = stdout.slice(0, separatorIndex);
    const statusCode = Number(stdout.slice(separatorIndex + 1).trim());

    if (!Number.isInteger(statusCode) || statusCode < 100) {
        throw new Error("Unable to determine the weather provider response status");
    }

    if (statusCode === 429) {
        throw new WeatherServiceError(
            "The weather provider is temporarily limiting requests. Please try again later.",
            429,
            "PROVIDER_RATE_LIMITED"
        );
    }

    if (statusCode >= 500) {
        throw new WeatherServiceError(
            "The weather provider is temporarily unavailable.",
            502,
            "PROVIDER_UNAVAILABLE"
        );
    }

    if (statusCode >= 400) {
        throw new WeatherServiceError(
            "The weather provider rejected the request.",
            502,
            "PROVIDER_REQUEST_FAILED"
        );
    }

    try {
        return JSON.parse(responseBody);
    } catch {
        throw new Error("The weather provider returned invalid JSON");
    }
}

function getCachedRequest(key, ttl, requestFunction) {
    const cachedEntry = cache.get(key);

    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
        return Promise.resolve(cachedEntry.data);
    }

    if (cachedEntry) {
        cache.delete(key);
    }

    if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
    }

    const request = Promise.resolve()
        .then(requestFunction)
        .then((data) => {
            if (cache.size >= MAX_CACHE_ENTRIES) {
                const oldestKey = cache.keys().next().value;

                if (oldestKey !== undefined) {
                    cache.delete(oldestKey);
                }
            }

            cache.set(key, {
                data,
                expiresAt: Date.now() + ttl
            });

            return data;
        })
        .finally(() => {
            pendingRequests.delete(key);
        });

    pendingRequests.set(key, request);

    return request;
}

async function searchLocations(city) {
    const cityName = city.trim();

    if (!cityName) {
        throw new Error("City name is required");
    }

    const cacheKey = `locations:${cityName.toLowerCase()}`;

    return getCachedRequest(
        cacheKey,
        LOCATION_CACHE_TTL,
        async () => {
            const data = await fetchJson(
                `${GEOCODING_API}?name=${encodeURIComponent(cityName)}&count=10&language=en&format=json`
            );

            return (data.results || []).map((location) => ({
                name: location.name,
                region: location.admin1 || "",
                country: location.country || "",
                countryCode: location.country_code || "",
                latitude: location.latitude,
                longitude: location.longitude,
                timezone: location.timezone || ""
            }));
        }
    );
}

async function getWeatherByCoordinates(latitude, longitude, location) {
    const cacheKey = `weather:${latitude.toFixed(4)}:${longitude.toFixed(4)}`;

    return getCachedRequest(
        cacheKey,
        WEATHER_CACHE_TTL,
        async () => {
            const weatherData = await fetchJson(
                `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
            );

            const current = weatherData.current;

            if (!current) {
                throw new Error("Weather information is unavailable");
            }

            return {
                city: location.name,
                region: location.region || "",
                country: location.country,
                temperature: current.temperature_2m,
                feelsLike: current.apparent_temperature,
                humidity: current.relative_humidity_2m,
                windSpeed: current.wind_speed_10m,
                weatherCode: current.weather_code,
                description:
                    weatherDescriptions[current.weather_code] ||
                    "Unknown weather condition"
            };
        }
    );
}

async function getWeatherByCity(city) {
    const locations = await searchLocations(city);

    if (locations.length === 0) {
        return null;
    }

    return getWeatherByCoordinates(
        locations[0].latitude,
        locations[0].longitude,
        locations[0]
    );
}

module.exports = {
    searchLocations,
    getWeatherByCoordinates,
    getWeatherByCity
};
