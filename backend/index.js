import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDB } from "./database/mongoDB.js";

import authRoutes from "./routes/auth.route.js";

const app = express();
dotenv.config();

app.use(
	cors({
		origin: "http://localhost:5173",
		credentials: true,
	}),
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
	res.send("Welcome to the backend server!");
});
app.use("/api/auth", authRoutes);

app.listen(5000, () => {
	connectDB();
	console.log("Server is running on http://localhost:5000");
});
