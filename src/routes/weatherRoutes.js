const express = require("express");

const {
    getWeather,
    getLocations
} = require("../controllers/weatherController");

const router = express.Router();

// Search for matching cities and locations
router.get("/locations", getLocations);

// Retrieve weather for a selected location
router.get("/", getWeather);

module.exports = router;
