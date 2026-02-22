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

const BRAND = {
  name: "Excellent AI Tutor",
  color: "#8b1a2b",
  from: `"Excellent AI Tutor" <${process.env.SMTP_USER}>`,
};

function baseTemplate(content: string): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e8ddd8;">
      <div style="background: linear-gradient(135deg, #8b1a2b 0%, #b42d42 50%, #6d1420 100%); padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px;">EXCELLENT</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 11px; letter-spacing: 2px;">AI TUTOR PLATFORM</p>
      </div>
      ${content}
      <div style="background: #faf5f3; padding: 16px 24px; text-align: center; border-top: 1px solid #e8ddd8;">
        <p style="color: #999; margin: 0; font-size: 11px;">Excellent PU Science College, Vijayapur</p>
      </div>
    </div>
  `;
}

export async function sendDoubtResponseEmail(params: {
  to: string;
  studentName: string;
  question: string;
  aiResponse: string;
  subject: string | null;
  topic: string | null;
  modelUsed: string | null;
  doubtId: string;
}) {
  const { to, studentName, question, aiResponse, subject, topic, modelUsed, doubtId } = params;

  const cleanResponse = aiResponse
    .replace(/##\s*/g, "<strong>")
    .replace(/\n\n/g, "</strong><br><br>")
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/- /g, "• ");

  const html = baseTemplate(`
    <div style="padding: 28px 24px;">
      <p style="color: #1a0a0a; margin: 0 0 4px; font-size: 16px; font-weight: 600;">Hi ${studentName},</p>
      <p style="color: #6b5c5c; margin: 0 0 20px; font-size: 14px;">Here's the AI response to your doubt:</p>

      <div style="background: #f0f4ff; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 16px;">
        <p style="color: #6b5c5c; margin: 0 0 4px; font-size: 11px; font-weight: 600; text-transform: uppercase;">Your Question</p>
        <p style="color: #1a0a0a; margin: 0; font-size: 14px;">${question}</p>
      </div>

      ${subject || topic ? `
      <div style="margin-bottom: 16px;">
        ${subject ? `<span style="display: inline-block; background: #f3e8f5; color: #8b1a2b; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; margin-right: 6px;">${subject}</span>` : ""}
        ${topic ? `<span style="display: inline-block; background: #e8f0fe; color: #1a56db; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;">${topic}</span>` : ""}
      </div>
      ` : ""}

      <div style="background: #fafafa; border-radius: 8px; padding: 20px; border: 1px solid #e8ddd8;">
        <p style="color: #6b5c5c; margin: 0 0 8px; font-size: 11px; font-weight: 600; text-transform: uppercase;">AI Response ${modelUsed ? `(${modelUsed})` : ""}</p>
        <div style="color: #1a0a0a; font-size: 14px; line-height: 1.7;">${cleanResponse}</div>
      </div>

      <div style="margin-top: 24px; text-align: center;">
        <a href="${process.env.NEXTAUTH_URL || "https://steady-klepon-3bde70.netlify.app"}/student/doubt/${doubtId}" style="display: inline-block; background: linear-gradient(135deg, #8b1a2b, #b42d42); color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">View Full Response &amp; Ask Follow-up</a>
      </div>

      <p style="color: #999; margin: 20px 0 0; font-size: 12px; text-align: center;">Need more help? Ask a follow-up question on the platform.</p>
    </div>
  `);

  try {
    await transporter.sendMail({
      from: BRAND.from,
      to,
      subject: `Your Doubt on ${subject || "the platform"} — AI Response Ready`,
      html,
    });
  } catch (e) {
    console.error("Failed to send doubt email:", e);
  }
}

export async function sendWeeklySummaryEmail(params: {
  to: string;
  studentName: string;
  weekStats: {
    doubtsAsked: number;
    resolved: number;
    topSubject: string;
    weakestTopic: string;
    streak: number;
    avgConfidence: number;
  };
}) {
  const { to, studentName, weekStats } = params;

  const html = baseTemplate(`
    <div style="padding: 28px 24px;">
      <p style="color: #1a0a0a; margin: 0 0 4px; font-size: 16px; font-weight: 600;">Hi ${studentName},</p>
      <p style="color: #6b5c5c; margin: 0 0 24px; font-size: 14px;">Here's your weekly learning summary:</p>

      <div style="display: flex; gap: 12px; margin-bottom: 20px;">
        <div style="flex: 1; background: #f0f9ff; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="color: #8b1a2b; font-size: 28px; font-weight: 800; margin: 0;">${weekStats.doubtsAsked}</p>
          <p style="color: #6b5c5c; font-size: 12px; margin: 4px 0 0;">Doubts Asked</p>
        </div>
        <div style="flex: 1; background: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="color: #16a34a; font-size: 28px; font-weight: 800; margin: 0;">${weekStats.resolved}</p>
          <p style="color: #6b5c5c; font-size: 12px; margin: 4px 0 0;">Resolved</p>
        </div>
        <div style="flex: 1; background: #fefce8; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="color: #ca8a04; font-size: 28px; font-weight: 800; margin: 0;">${weekStats.streak}</p>
          <p style="color: #6b5c5c; font-size: 12px; margin: 4px 0 0;">Day Streak</p>
        </div>
      </div>

      <div style="background: #fafafa; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid #e8ddd8;">
        <p style="margin: 0 0 8px; font-size: 13px;"><strong>Top Subject:</strong> ${weekStats.topSubject || "—"}</p>
        <p style="margin: 0 0 8px; font-size: 13px;"><strong>Focus Area:</strong> ${weekStats.weakestTopic || "—"} <span style="color: #dc2626;">(needs attention)</span></p>
        <p style="margin: 0; font-size: 13px;"><strong>Avg Confidence:</strong> ${weekStats.avgConfidence}%</p>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${process.env.NEXTAUTH_URL || "https://steady-klepon-3bde70.netlify.app"}/student/dashboard" style="display: inline-block; background: linear-gradient(135deg, #8b1a2b, #b42d42); color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">View Full Report</a>
      </div>
    </div>
  `);

  try {
    await transporter.sendMail({
      from: BRAND.from,
      to,
      subject: `Your Weekly Learning Report — ${weekStats.doubtsAsked} doubts this week`,
      html,
    });
  } catch (e) {
    console.error("Failed to send weekly email:", e);
  }
}

export async function sendPasswordResetEmail(to: string, otp: string) {
  const html = baseTemplate(`
    <div style="padding: 32px 24px; text-align: center;">
      <h2 style="color: #1a0a0a; margin: 0 0 8px; font-size: 20px;">Reset Your Password</h2>
      <p style="color: #6b5c5c; margin: 0 0 24px; font-size: 14px;">Use this code to reset your password</p>
      <div style="background: #faf5f3; border: 2px dashed #8b1a2b; border-radius: 12px; padding: 20px; margin: 0 auto; max-width: 220px;">
        <span style="font-size: 36px; font-weight: 800; color: #8b1a2b; letter-spacing: 8px;">${otp}</span>
      </div>
      <p style="color: #6b5c5c; margin: 24px 0 0; font-size: 13px;">This code expires in <strong style="color: #8b1a2b;">10 minutes</strong></p>
      <p style="color: #999; margin: 16px 0 0; font-size: 11px;">If you didn't request this, please ignore this email.</p>
    </div>
  `);

  await transporter.sendMail({
    from: BRAND.from,
    to,
    subject: `${otp} — Password Reset Code | Excellent AI Tutor`,
    html,
  });
}
