import { VERIFICATION_EMAIL_TEMPLATE } from "./emailTemplates.js";
import { mailtrapClient, sender } from "./mailtrap.config.js";

export const sendVerificationEmail = async (email, verificationToken) => {
	const recipient = [{ email }];

	try {
		const response = await mailtrapClient.send({
			from: sender,
			to: recipient,
			subject: "Verify your email address",
			html: VERIFICATION_EMAIL_TEMPLATE.replace(
				"{verificationCode}",
				verificationToken,
			),
			category: "Email Verification",
		});

		console.log("Email sent successfully:", response);
	} catch (err) {
		console.error("Error sending verification email:", err);
		throw new Error(`Failed to send verification email: ${err.message}`);
	}
};
