import crypto from "node:crypto";

/**
 * Email Service Abstraction
 * Supports multiple email providers: Resend, SendGrid, Nodemailer (SMTP)
 * Configure via EMAIL_SERVICE environment variable
 */

const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const hashResetToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const createResetLink = (token) => {
  const frontendUrl = (
    process.env.PASSWORD_RESET_URL ||
    process.env.FRONTEND_URL?.split(",")[0]?.trim() ||
    "http://localhost:5173"
  ).replace(/\/+$/, "");
  return `${frontendUrl}/reset-password?token=${token}`;
};

/**
 * Send password reset email
 * @param {string} email - User's email address
 * @param {string} resetToken - Raw reset token (not hashed)
 * @returns {Promise<void>}
 */
export const sendPasswordResetEmail = async (email, resetToken) => {
  const emailService = process.env.EMAIL_SERVICE || "console";
  const resetLink = createResetLink(resetToken);

  switch (emailService) {
    case "resend":
      await sendViaResend(email, resetLink);
      break;
    case "sendgrid":
      await sendViaSendGrid(email, resetLink);
      break;
    case "nodemailer":
      await sendViaNodemailer(email, resetLink);
      break;
    case "console":
    default:
      console.log("Password reset email (console mode):", {
        to: email,
        resetLink,
        message: "Configure EMAIL_SERVICE to send real emails",
      });
  }
};

/**
 * Send via Resend (https://resend.com)
 */
const sendViaResend = async (email, resetLink) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required for Resend email service");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "noreply@agrochemicals.com",
      to: email,
      subject: "Reset Your Password",
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your account.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }
};

/**
 * Send via SendGrid (https://sendgrid.com)
 */
const sendViaSendGrid = async (email, resetLink) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is required for SendGrid email service");
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email }],
          subject: "Reset Your Password",
        },
      ],
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || "noreply@agrochemicals.com",
      },
      content: [
        {
          type: "text/html",
          value: `
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your account.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this, please ignore this email.</p>
          `,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid API error: ${error}`);
  }
};

/**
 * Send via Nodemailer (SMTP)
 */
const sendViaNodemailer = async (email, resetLink) => {
  // This requires nodemailer package to be installed
  // For now, fall back to console
  console.log("Nodemailer not configured. Please install nodemailer package.");
  console.log("Password reset email:", { to: email, resetLink });
};

export { generateResetToken, hashResetToken };
