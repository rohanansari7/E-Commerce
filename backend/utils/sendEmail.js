import nodemailer from "nodemailer";

// ─── Transporter ────────────────────────────────────────────────────────────
const createTransporter = () =>
    nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true", // true for port 465
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

// ─── Welcome + OTP HTML Template ────────────────────────────────────────────
const welcomeEmailTemplate = (name, otp) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to PhonePay</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', Arial, sans-serif;
      background-color: #f0f4ff;
      color: #1a1a2e;
    }

    .wrapper {
      max-width: 600px;
      margin: 40px auto;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(99, 102, 241, 0.15);
    }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      padding: 48px 40px 36px;
      text-align: center;
    }

    .logo {
      font-size: 32px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.5px;
    }

    .logo span {
      color: #a5f3fc;
    }

    .header-tagline {
      color: rgba(255,255,255,0.75);
      font-size: 14px;
      margin-top: 6px;
      letter-spacing: 0.5px;
    }

    /* ── Body ── */
    .body {
      background: #ffffff;
      padding: 44px 40px;
    }

    .greeting {
      font-size: 26px;
      font-weight: 700;
      color: #1e1b4b;
      margin-bottom: 12px;
    }

    .intro {
      font-size: 15px;
      line-height: 1.7;
      color: #4b5563;
      margin-bottom: 32px;
    }

    /* ── OTP Box ── */
    .otp-label {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #7c3aed;
      margin-bottom: 10px;
    }

    .otp-box {
      background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
      border: 2px dashed #7c3aed;
      border-radius: 14px;
      padding: 24px;
      text-align: center;
      margin-bottom: 32px;
    }

    .otp-code {
      font-size: 42px;
      font-weight: 700;
      letter-spacing: 12px;
      color: #4f46e5;
    }

    .otp-expiry {
      font-size: 13px;
      color: #6b7280;
      margin-top: 10px;
    }

    /* ── Divider ── */
    .divider {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 28px 0;
    }

    /* ── Features ── */
    .features-title {
      font-size: 17px;
      font-weight: 600;
      color: #1e1b4b;
      margin-bottom: 18px;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .feature-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
      margin-right: 14px;
    }

    .feature-text strong {
      font-size: 14px;
      color: #111827;
    }

    .feature-text p {
      font-size: 13px;
      color: #6b7280;
      margin-top: 2px;
      line-height: 1.5;
    }

    /* ── CTA Button ── */
    .cta-wrapper {
      text-align: center;
      margin: 36px 0 10px;
    }

    .cta-btn {
      display: inline-block;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 40px;
      border-radius: 50px;
      letter-spacing: 0.3px;
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
    }

    /* ── Footer ── */
    .footer {
      background: #f9fafb;
      padding: 28px 40px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }

    .footer p {
      font-size: 12px;
      color: #9ca3af;
      line-height: 1.7;
    }

    .footer a {
      color: #7c3aed;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">

    <!-- Header -->
    <div class="header">
      <div class="logo">Phone<span>Pay</span></div>
      <div class="header-tagline">Your trusted digital payments partner</div>
    </div>

    <!-- Body -->
    <div class="body">
      <div class="greeting">Welcome aboard, ${name}! 🎉</div>
      <p class="intro">
        We're thrilled to have you join the <strong>PhonePay</strong> family.
        Your account has been created successfully. To complete your verification,
        please use the One-Time Password (OTP) below:
      </p>

      <!-- OTP -->
      <div class="otp-label">Your Verification OTP</div>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="otp-expiry">⏳ This OTP expires in <strong>10 minutes</strong></div>
      </div>

      <hr class="divider" />

      <!-- Features -->
      <div class="features-title">What you can do with PhonePay</div>

      <div class="feature-item">
        <div class="feature-icon">💸</div>
        <div class="feature-text">
          <strong>Instant Money Transfers</strong>
          <p>Send and receive money instantly across India, 24/7.</p>
        </div>
      </div>

      <div class="feature-item">
        <div class="feature-icon">🔒</div>
        <div class="feature-text">
          <strong>Bank-Grade Security</strong>
          <p>End-to-end encryption keeps every transaction safe.</p>
        </div>
      </div>

      <div class="feature-item">
        <div class="feature-icon">📊</div>
        <div class="feature-text">
          <strong>Smart Expense Tracking</strong>
          <p>Monitor your spending with detailed analytics & reports.</p>
        </div>
      </div>

      <!-- CTA -->
      <div class="cta-wrapper">
        <a href="${process.env.FRONTEND_URL || "#"}" class="cta-btn">Get Started →</a>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>
        If you did not create this account, please
        <a href="mailto:support@phonepay.com">contact support</a> immediately.<br/>
        © ${new Date().getFullYear()} PhonePay. All rights reserved.<br/>
        <a href="#">Privacy Policy</a> · <a href="#">Terms of Service</a>
      </p>
    </div>

  </div>
</body>
</html>
`;

export const sendWelcomeEmail = async (toEmail, name, otp) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: `"PhonePay" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `Welcome to PhonePay 🎉 – Your OTP is ${otp}`,
        html: welcomeEmailTemplate(name, otp),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${toEmail} [MessageId: ${info.messageId}]`);
    return info;
};
