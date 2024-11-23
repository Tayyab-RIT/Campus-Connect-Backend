// app.js
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

dotenv.config(); // Load environment variables

const app = express();
const port = process.env.PORT || 5000;

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Enable CORS for all routes
app.use(
	cors({
		origin: "http://localhost:4200", // Allow Angular frontend
		credentials: true, // Allow cookies and headers if needed
	})
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Simple route to test server
app.get("/health", (req, res) => {
	res.send("Health UP");
});
app.get("/", (req, res) => {
	res.send("Campus Connect API is running!");
});

const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

// Start the server
app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
