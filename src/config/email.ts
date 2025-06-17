import nodemailer from 'nodemailer';

// Create reusable transporter object using SMTP transport
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com', // e.g., 'smtp.gmail.com'
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // your email
    pass: process.env.SMTP_PASS, // your email password or app password
  },
});

// Verify connection configuration
export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Email server is ready to take our messages');
  } catch (error) {
    console.error('Email server connection failed:', error);
  }
};

// Email template for password reset
export const createPasswordResetEmail = (resetCode: string, userEmail: string) => {
  return {
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to: userEmail,
    subject: 'Password Reset Request',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
          <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
          <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
            You have requested to reset your password. Use the verification code below:
          </p>
          <div style="background-color: #007bff; color: white; padding: 15px 30px; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
            ${resetCode}
          </div>
          <p style="color: #dc3545; font-size: 14px; margin-top: 20px;">
            ⚠️ This code will expire in 2 minutes for security reasons.
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            If you didn't request this password reset, please ignore this email.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    `,
  };
};