import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
	const token = req.cookies.token;

	try {
		if (!token) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		if (!decoded) {
			return res.status(401).json({ message: "Unauthorized" });
		}
		req.userId = decoded.userId;
		next();
	} catch (err) {
		console.error("Error verifying token:", err);
		return res.status(401).json({ message: "Unauthorized" });
	}
};
