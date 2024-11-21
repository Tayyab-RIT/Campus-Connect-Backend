// routes/auth.js
const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// User registration route
router.post("/register", async (req, res) => {
	const { email, password } = req.body;
	const { user, error } = await supabase.auth.signUp({ email, password });

	if (error) {
		return res.status(400).json({ error: error.message });
	}
	res.status(201).json({ message: "User registered successfully", user });
});

// User login route
router.post("/login", async (req, res) => {
	const { email, password } = req.body;
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) {
		return res.status(400).json({ error: error.message });
	}
	res.status(200).json({ message: "Login successful", data });
});

router.get("/health", async (req, res) => {
	res.send("AUTH health working");
});

router.get("/profile", async (req, res) => {
	const token = req.headers.authorization?.split(" ")[1];
	if (!token) {
		return res.status(401).json({ error: "Authorization token missing" });
	}

	const {
		data: { user },
	} = await supabase.auth.getUser(token.trim());

	if (!user) {
		return res.status(401).json({ error: "User not found" });
	}

	const { data, error } = await supabase.from("user_data").select("*").eq("user_id", user.id).single();

	if (error) {
		return res.status(400).json({ error: error.message });
	}

	res.status(200).json({ data });
});

module.exports = router;
