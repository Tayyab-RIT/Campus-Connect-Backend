// routes/auth.js
const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// User registration route
router.post("/register", async (req, res) => {
	const { email, password, fullName } = req.body; // Include username in the request
	const userData = await supabase.auth.signUp({ email, password });
	const user = userData.data.user;
	const error = userData.error;
	if (error) {
		return res.status(400).json({ error: error.message });
	}

	// Create a new record in user_data
	const { data, error: userDataError } = await supabase.from("user_data").insert({
		user_id: user.id, // Link to the auth user
		full_name: fullName || null, // Set username if provided
	});

	if (userDataError) {
		return res.status(400).json({ error: `User registered, but user_data creation failed: ${userDataError.message}` });
	}

	res.status(201).json({ message: "User registered successfully", user, userData: data });
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

router.get("/current-user", async (req, res) => {
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

	res.status(200).json({ data: user });
});

router.get("/profile/:username", async (req, res) => {
	const { username } = req.params;
	console.log(username);

	const { data: user, error: userError } = await supabase.from("user_data").select("*").eq("username", username).single();

	if (userError) {
		return res.status(400).json({ error: userError.message });
	}

	if (!user) {
		return res.status(404).json({ error: "User not found" });
	}

	res.status(200).json({ data: user });
});

router.put("/profile", async (req, res) => {
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

	const { data, error } = await supabase
		.from("user_data")
		.update({ ...req.body })
		.eq("user_id", user.id);

	if (error) {
		return res.status(400).json({ error: error.message });
	}

	res.status(200).json({ data });
});

router.get("/feed", async (req, res) => {
	let { page, filter } = req.query;
	page = page || 1; // Default page to 1 if not provided
	const rangeStart = (page - 1) * 10;
	const rangeEnd = page * 10;

	let query = supabase
		.from("post")
		.select(
			`id,
		user_id,
		content,
		image,
		created_at,
		comment (
		  id,
		  user_id,
		  content,
		  created_at
		),
		like (id, user_id)`
		)
		.range(rangeStart, rangeEnd);

	// Add the filter condition only if filter exists
	console.log(filter);

	if (filter !== "null" && filter !== "undefined") {
		query = query.like("content", `%${filter}%`);
		console.log(query);
	}

	const { data, error } = await query;

	if (error) {
		return res.status(400).json({ error: error.message });
	}

	res.status(200).json({ data });
});

router.post("/like/:postId", async (req, res) => {
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

	const { postId } = req.params;

	const { data, error } = await supabase.from("like").insert({ post_id: postId, user_id: user.id });

	if (error) {
		return res.status(400).json({ error: error.message });
	}

	res.status(201).json({ message: "Post liked successfully", data });
});

router.delete("/like/:postId", async (req, res) => {
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

	const { postId } = req.params;

	const { data, error } = await supabase.from("like").delete().eq("post_id", postId).eq("user_id", user.id);

	if (error) {
		return res.status(400).json({ error: error.message });
	}

	res.status(200).json({ message: "Post unliked successfully", data });
});

router.post("/comment/:postId", async (req, res) => {
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

	const { postId } = req.params;
	const { content } = req.body;

	if (!content) {
		return res.status(400).json({ error: "Comment content is required" });
	}

	const { data, error } = await supabase
		.from("comment")
		.insert({
			post_id: postId,
			user_id: user.id,
			content: content,
			created_at: new Date().toISOString(), // Optional: Set manually if necessary
		})
		.select();

	if (error) {
		return res.status(400).json({ error: error.message });
	}

	res.status(201).json({ message: "Comment added successfully", data });
});

router.get("/tutor/slots", async (req, res) => {
	const { data, error } = await supabase.from("tutor_slot").select(`
		id,
    tutor_id,
    topic,
    date,
    time,
    duration,
    max_students,
    current_students`);

	if (error) {
		return res.status(400).json({ error: error.message });
	}

	res.status(200).json({ slots: data });
});

router.post("/tutor/slots", async (req, res) => {
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

	const { topic, date, time, duration, max_students } = req.body;

	// Check if the user is a tutor
	const { data, error } = await supabase.from("user_data").select("is_tutor").eq("user_id", user.id).single();

	if (error || !data.is_tutor) {
		return res.status(403).json({ error: "You are not a tutor" });
	}

	const { data: slot, error: slotError } = await supabase.from("tutor_slot").insert({
		tutor_id: user.id,
		topic,
		date,
		time,
		duration,
		max_students,
		current_students: 0,
	});

	if (slotError) {
		return res.status(400).json({ error: slotError.message });
	}

	res.status(201).json({ message: "Slot created successfully", slot });
});

router.post("/tutor/book", async (req, res) => {
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

	const { slot_id } = req.body;

	// Check if slot exists and has available space
	const { data: slot, error: slotError } = await supabase.from("tutor_slot").select("id, max_students, current_students").eq("id", slot_id).single();

	if (slotError || !slot) {
		return res.status(400).json({ error: "Slot not found" });
	}

	if (slot.current_students >= slot.max_students) {
		return res.status(400).json({ error: "Slot is fully booked" });
	}

	// Add the booking
	const { data: booking, error: bookingError } = await supabase.from("tutor_booking").insert({
		slot_id,
		student_id: user.id,
		created_at: new Date().toISOString(),
	});

	if (bookingError) {
		return res.status(400).json({ error: bookingError.message });
	}

	// Update current_students in the slot
	const { error: updateError } = await supabase
		.from("tutor_slot")
		.update({ current_students: slot.current_students + 1 })
		.eq("id", slot_id);

	if (updateError) {
		return res.status(400).json({ error: updateError.message });
	}

	res.status(201).json({ message: "Slot booked successfully", booking });
});

router.get("/tutor/bookings", async (req, res) => {
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

	// Check if the user is a tutor
	const { data, error } = await supabase.from("user_data").select("is_tutor").eq("user_id", user.id).single();

	if (error || !data.is_tutor) {
		return res.status(403).json({ error: "You are not a tutor" });
	}

	// Fetch bookings for all the tutor's slots
	const { data: bookings, error: bookingsError } = await supabase
		.from("tutor_booking")
		.select(
			`
		id,
		slot_id,
		student_id,
		booked_at,
		tutor_slots (
		  topic,
		  date,
		  time
		)
	  `
		)
		.eq("tutor_id", user.id);

	if (bookingsError) {
		return res.status(400).json({ error: bookingsError.message });
	}

	res.status(200).json({ bookings });
});

router.delete("/tutor/slots/:slotId", async (req, res) => {
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

	const { slotId } = req.params;

	// Check if the user is a tutor and owns the slot
	const { data: slot, error: slotError } = await supabase.from("tutor_slot").select("id, tutor_id, current_students").eq("id", slotId).single();

	if (slotError || !slot) {
		return res.status(400).json({ error: "Slot not found" });
	}

	if (slot.tutor_id !== user.id) {
		return res.status(403).json({ error: "You do not own this slot" });
	}

	if (slot.current_students > 0) {
		return res.status(400).json({ error: "Cannot delete a slot with bookings" });
	}

	const { error: deleteError } = await supabase.from("tutor_slots").delete().eq("id", slotId);

	if (deleteError) {
		return res.status(400).json({ error: deleteError.message });
	}

	res.status(200).json({ message: "Slot deleted successfully" });
});

router.post("/become-tutor", async (req, res) => {
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

	const { error } = await supabase.from("user_data").update({ is_tutor: true }).eq("user_id", user.id);

	if (error) {
		return res.status(400).json({ error: error.message });
	}

	res.status(200).json({ message: "You are now a tutor!" });
});

module.exports = router;
