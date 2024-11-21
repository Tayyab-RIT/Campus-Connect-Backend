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
	const { page, filter } = req.query;

	const { data, error } = await supabase
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
		.range((page - 1) * 10, page * 10);

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

module.exports = router;
