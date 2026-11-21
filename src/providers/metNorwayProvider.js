
const MET_NORWAY_API =
    "https://api.met.no/weatherapi/locationforecast/2.0/compact";

const USER_AGENT =
    "WeatherNow/1.0 (https://github.com/QueenColly)";

// Lagos is outside the Nordic region.
// MET Norway requires at least 3 hours between identical requests.
const MIN_CACHE_TIME = 3 * 60 * 60 * 1000;

const weatherDescriptions = {
    clearsky: { code: 0, description: "Clear sky" },
    fair: { code: 1, description: "Mainly clear" },
    partlycloudy: { code: 2, description: "Partly cloudy" },
    cloudy: { code: 3, description: "Overcast" },
    fog: { code: 45, description: "Fog" },
    lightrain: { code: 61, description: "Light rain" },
    rain: { code: 63, description: "Moderate rain" },
    heavyrain: { code: 65, description: "Heavy rain" },
    lightsnow: { code: 71, description: "Light snow" },
    snow: { code: 73, description: "Moderate snow" },
    heavysnow: { code: 75, description: "Heavy snow" },
    rainshowers: { code: 80, description: "Rain showers" },
    heavyrainshowers: { code: 82, description: "Heavy rain showers" },
    snowshowers: { code: 85, description: "Snow showers" },
    thunderstorm: { code: 95, description: "Thunderstorm" }
};

const forecastCache = new Map();

class MetNorwayError extends Error {
    constructor(message, code) {
        super(message);
        this.name = "MetNorwayError";
        this.code = code;
    }
}

function getWeatherDescription(symbolCode) {
    if (!symbolCode) {
        return {
            code: 3,
            description: "Weather forecast"
        };
    }

    const condition = symbolCode
        .replace(/_(day|night|polartwilight)$/, "")
        .replace(/_(light|heavy)$/, "");

    return weatherDescriptions[condition] || {
        code: 3,
        description: "Weather forecast"
    };
}

async function getForecast(latitude, longitude) {
    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        throw new Error("Invalid weather coordinates");
    }

    // MET Norway recommends no more than 4 decimal places.
    const lat = Number(latitude.toFixed(4));
    const lon = Number(longitude.toFixed(4));

    const cacheKey = `${lat}:${lon}`;

    const cached = forecastCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    const url = `${MET_NORWAY_API}?lat=${lat}&lon=${lon}`;

    const response = await fetch(url, {
        headers: {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate"
        }
    });

    if (response.status === 429) {
        throw new MetNorwayError(
            "MET Norway is temporarily limiting requests.",
            "PROVIDER_RATE_LIMITED"
        );
    }

    if (!response.ok) {
        throw new MetNorwayError(
            `MET Norway returned HTTP ${response.status}.`,
            "PROVIDER_UNAVAILABLE"
        );
    }

    const forecast = await response.json();

    const firstForecast = forecast.properties?.timeseries?.[0];

    if (!firstForecast?.data?.instant?.details) {
        throw new Error("MET Norway returned incomplete forecast data");
    }

    const details = firstForecast.data.instant.details;

    const symbolCode =
        firstForecast.data.next_1_hours?.summary?.symbol_code ||
        firstForecast.data.next_6_hours?.summary?.symbol_code ||
        firstForecast.data.next_12_hours?.summary?.symbol_code;

    const weather = getWeatherDescription(symbolCode);

    const weatherData = {
        temperature: details.air_temperature,
        feelsLike:
            details.apparent_air_temperature ??
            details.air_temperature,
        humidity: details.relative_humidity,
        windSpeed: Number((details.wind_speed * 3.6).toFixed(1)),
        weatherCode: weather.code,
        description: weather.description
    };

    const expiresHeader = response.headers.get("expires");

    const expiresFromHeader = expiresHeader
        ? new Date(expiresHeader).getTime()
        : 0;

    const cacheDuration = Math.max(
        MIN_CACHE_TIME,
        expiresFromHeader - Date.now()
    );

    forecastCache.set(cacheKey, {
        data: weatherData,
        expiresAt: Date.now() + cacheDuration,
        lastModified: response.headers.get("last-modified")
    });

    return weatherData;
}

module.exports = {
    getForecast,
    MetNorwayError
};
