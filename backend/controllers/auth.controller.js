import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
	sendPasswordResetEmail,
	sendResetSuccessEmail,
	sendVerificationEmail,
} from "../mailtrap/emails.js";
import { User } from "../models/user.model.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { generateVerificationCode } from "../utils/generateVerificationCode.js";

export const signup = async (req, res) => {
	try {
		const { email, password, name } = req.body;
		if (!email || !password || !name) {
			return res.status(400).json({ message: "All fields are required" });
		}

		const userAlreadyExists = await User.findOne({ email });
		if (userAlreadyExists) {
			return res.status(400).json({ message: "User already exists" });
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const user = new User({
			email,
			password: hashedPassword,
			name,
			verificationToken: generateVerificationCode(),
			verificationTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
		});

		await user.save();

		generateTokenAndSetCookie(res, user._id);

		await sendVerificationEmail(user.email, user.verificationToken);

		res.status(201).json({
			message: "User created successfully",
			user: {
				...user._doc,
				password: undefined,
			},
		});
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};

export const login = async (req, res) => {
	const { email, password } = req.body;
	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(400).json({ message: "Invalid credentials" });
		}

		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			return res.status(400).json({ message: "Invalid credentials" });
		}

		if (!user.isVerified) {
			return res.status(403).json({
				message: "Please verify your email before logging in",
			});
		}

		generateTokenAndSetCookie(res, user._id);
		user.lastLogin = new Date();
		await user.save();

		res.status(200).json({
			message: "Login successful",
			user: {
				...user._doc,
				password: undefined,
			},
		});
	} catch (err) {
		console.error("Error during login:", err);
		res.status(500).json({ message: "Internal server error" });
	}
};

export const logout = async (req, res) => {
	res.clearCookie("token");
	res.status(200).json({ message: "Logged out successfully" });
};

export const verifyEmail = async (req, res) => {
	const { code } = req.body;

	try {
		const user = await User.findOne({
			verificationToken: code,
			verificationTokenExpiresAt: { $gt: new Date() },
		});

		if (!user) {
			return res
				.status(400)
				.json({ message: "Invalid or expired verification code" });
		}

		user.isVerified = true;
		user.verificationToken = undefined;
		user.verificationTokenExpiresAt = undefined;

		await user.save();

		res.status(200).json({
			message: "Email verified successfully",
			user: {
				...user._doc,
				password: undefined,
			},
		});
	} catch (err) {
		console.error("Error verifying email:", err);
		res.status(500).json({ message: "Internal server error" });
	}
};

export const forgotPassword = async (req, res) => {
	const { email } = req.body;

	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(400).json({ message: "User not found" });
		}

		const resetToken = crypto.randomBytes(32).toString("hex");
		const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

		user.resetPasswordToken = resetToken;
		user.resetPassweordExpiresAt = resetTokenExpiresAt;
		await user.save();

		await sendPasswordResetEmail(
			user.email,
			`${process.env.CLIENT_URL}/reset-password/${resetToken}`,
		);

		res.status(200).json({
			message: "Password reset email sent successfully",
		});
	} catch (err) {
		console.error("Error in forgotPassword:", err);
		res.status(500).json({ message: "Internal server error" });
	}
};

export const resetPassword = async (req, res) => {
	const { token } = req.params;
	const { newPassword } = req.body;

	try {
		if (!token) {
			return res.status(400).json({ message: "Token is required" });
		}

		if (!newPassword) {
			return res.status(400).json({ message: "New password is required" });
		}

		const user = await User.findOne({
			resetPasswordToken: token,
			resetPassweordExpiresAt: { $gt: new Date() },
		});

		if (!user) {
			return res
				.status(400)
				.json({ message: "Invalid or expired password reset token" });
		}

		const hashedPassword = await bcrypt.hash(newPassword, 10);
		user.password = hashedPassword;
		user.resetPasswordToken = undefined;
		user.resetPassweordExpiresAt = undefined;
		await user.save();

		await sendResetSuccessEmail(user.email);

		res.status(200).json({
			message: "Password reset successfully",
			user: {
				...user._doc,
				password: undefined,
			},
		});
	} catch (err) {
		console.error("Error in resetPassword:", err);
		return res.status(500).json({ message: "Internal server error" });
	}
};

export const checkAuth = async (req, res) => {
	try {
		const user = await User.findById(req.userId);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.status(200).json({
			user: {
				...user._doc,
				password: undefined,
			},
		});
	} catch (err) {
		console.error("Error in checkAuth:", err);
		return res.status(500).json({ message: "Internal server error" });
	}
};
