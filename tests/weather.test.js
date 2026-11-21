const request = require("supertest");
const app = require("../src/app");

jest.mock("../src/services/weatherService", () => ({
    searchLocations: jest.fn(),
    getWeatherByCoordinates: jest.fn()
}));

const {
    searchLocations,
    getWeatherByCoordinates
} = require("../src/services/weatherService");

describe("Weather API", () => {
    beforeEach(() => {
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe("GET /api/weather", () => {
        test("returns weather for a valid location", async () => {
            getWeatherByCoordinates.mockResolvedValue({
                city: "Lagos",
                region: "Lagos",
                country: "Nigeria",
                temperature: 31.1,
                feelsLike: 36.5,
                humidity: 66,
                windSpeed: 11.2,
                weatherCode: 51,
                description: "Light drizzle"
            });

            const response = await request(app)
                .get("/api/weather?latitude=6.52&longitude=3.37&city=Lagos&country=Nigeria");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.city).toBe("Lagos");
            expect(response.body.data.temperature).toBe(31.1);
            expect(getWeatherByCoordinates).toHaveBeenCalledWith(
                6.52,
                3.37,
                { name: "Lagos", region: "", country: "Nigeria" }
            );
        });

        test("rejects a request with missing coordinates", async () => {
            const response = await request(app)
                .get("/api/weather?city=Lagos&country=Nigeria");

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(getWeatherByCoordinates).not.toHaveBeenCalled();
        });

        test("rejects coordinates outside valid ranges", async () => {
            const response = await request(app)
                .get("/api/weather?latitude=100&longitude=3.37&city=Lagos&country=Nigeria");

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(getWeatherByCoordinates).not.toHaveBeenCalled();
        });

        test("returns 502 when the weather service fails", async () => {
            getWeatherByCoordinates.mockRejectedValue(
                new Error("External API unavailable")
            );

            const response = await request(app)
                .get("/api/weather?latitude=6.52&longitude=3.37&city=Lagos&country=Nigeria");

            expect(response.status).toBe(502);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain("Unable to retrieve");
        });
    });

    describe("GET /api/weather/locations", () => {
        test("returns matching locations for a city search", async () => {
            searchLocations.mockResolvedValue([
                {
                    name: "Lagos",
                    region: "Lagos",
                    country: "Nigeria",
                    countryCode: "NG",
                    latitude: 6.52,
                    longitude: 3.37,
                    timezone: "Africa/Lagos"
                }
            ]);

            const response = await request(app)
                .get("/api/weather/locations?city=Lagos");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].name).toBe("Lagos");
            expect(searchLocations).toHaveBeenCalledWith("Lagos");
        });

        test("returns an empty list when no locations match", async () => {
            searchLocations.mockResolvedValue([]);

            const response = await request(app)
                .get("/api/weather/locations?city=UnknownCity");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });

        test("rejects a location search with no city name", async () => {
            const response = await request(app)
                .get("/api/weather/locations");

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(searchLocations).not.toHaveBeenCalled();
        });

        test("returns 502 when location search fails", async () => {
            searchLocations.mockRejectedValue(
                new Error("Geocoding API unavailable")
            );

            const response = await request(app)
                .get("/api/weather/locations?city=Lagos");

            expect(response.status).toBe(502);
            expect(response.body.success).toBe(false);
        });
    });
});
