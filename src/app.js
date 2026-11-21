const express = require("express");
const path = require("path");
const weatherRoutes = require("./routes/weatherRoutes");

const app = express();

// Parse incoming JSON requests
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, "../public")));

// Weather API routes
app.use("/api/weather", weatherRoutes);

// Handle unknown API routes
app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

module.exports = app;
