const {
    searchLocations,
    getWeatherByCoordinates
} = require("../services/weatherService");

async function getLocations(req, res) {
    const { city } = req.query;

    if (!city || !city.trim()) {
        return res.status(400).json({
            success: false,
            message: "Please provide a city name"
        });
    }

    try {
        const locations = await searchLocations(city);

        return res.status(200).json({
            success: true,
            data: locations
        });
    } catch (error) {
        console.error("Location search error:", error);

        return res.status(502).json({
            success: false,
            message: "Unable to search for locations. Please try again."
        });
    }
}

async function getWeather(req, res) {
    const { latitude, longitude, city, region, country } = req.query;

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (
        latitude === undefined ||
        longitude === undefined ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180 ||
        !city ||
        !country
    ) {
        return res.status(400).json({
            success: false,
            message: "Please select a valid location"
        });
    }

    try {
        const weather = await getWeatherByCoordinates(lat, lon, {
            name: city,
            region: region || "",
            country
        });

        return res.status(200).json({
            success: true,
            data: weather
        });
    } catch (error) {
        console.error("Weather controller error:", error);

        return res.status(502).json({
            success: false,
            message: "Unable to retrieve weather information. Please try again."
        });
    }
}

module.exports = {
    getLocations,
    getWeather
};
