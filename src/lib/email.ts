import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e8ddd8;">
      <div style="background: linear-gradient(135deg, #8b1a2b 0%, #b42d42 50%, #6d1420 100%); padding: 32px 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px;">EXCELLENT</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 12px; letter-spacing: 2px;">PU SCIENCE COLLEGE, VIJAYAPUR</p>
      </div>
      <div style="padding: 32px 24px; text-align: center;">
        <h2 style="color: #1a0a0a; margin: 0 0 8px; font-size: 20px;">Verify Your Email</h2>
        <p style="color: #6b5c5c; margin: 0 0 24px; font-size: 14px;">Use this OTP to complete your registration on the AI Tutor Platform</p>
        <div style="background: #faf5f3; border: 2px dashed #8b1a2b; border-radius: 12px; padding: 20px; margin: 0 auto; max-width: 220px;">
          <span style="font-size: 36px; font-weight: 800; color: #8b1a2b; letter-spacing: 8px;">${otp}</span>
        </div>
        <p style="color: #6b5c5c; margin: 24px 0 0; font-size: 13px;">This code expires in <strong style="color: #8b1a2b;">10 minutes</strong></p>
        <p style="color: #999; margin: 16px 0 0; font-size: 11px;">If you didn't request this, please ignore this email.</p>
      </div>
      <div style="background: #faf5f3; padding: 16px 24px; text-align: center; border-top: 1px solid #e8ddd8;">
        <p style="color: #999; margin: 0; font-size: 11px;">Excellent PU Science College &mdash; AI Tutor Platform</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Excellent AI Tutor" <${process.env.SMTP_USER}>`,
    to,
    subject: `${otp} — Your Verification Code | Excellent AI Tutor`,
    html,
  });
}
