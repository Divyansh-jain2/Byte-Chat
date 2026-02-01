import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

// Create Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: config.email.gmailUser,
    pass: config.email.gmailPassword
  }
});

interface SendOTPEmailParams {
  to: string;
  otp: string;
  purpose: 'signup' | 'password_reset';
  rollNo: string;
  ipAddress?: string;
}

/**
 * Send OTP email using Resend
 */
export async function sendOTPEmail({
  to,
  otp,
  purpose,
  rollNo,
  ipAddress
}: SendOTPEmailParams): Promise<boolean> {
  try {
    const subject = purpose === 'signup' 
      ? 'Verify Your IIT Mandi Account'
      : 'Password Reset OTP';

    const htmlContent = purpose === 'signup' 
      ? getSignupEmailHTML(otp, rollNo, ipAddress)
      : getPasswordResetEmailHTML(otp, rollNo, ipAddress);

    console.log('📧 Attempting to send email via Gmail SMTP:');
    console.log('   To:', to);
    console.log('   From:', config.email.gmailUser);
    console.log('   Subject:', subject);

    const info = await transporter.sendMail({
      from: `"BYTE-CHAT - IIT Mandi" <${config.email.gmailUser}>`,
      to,
      subject,
      html: htmlContent
    });

    console.log('✅ Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
    }
    return false;
  }
}

function getSignupEmailHTML(otp: string, rollNo: string, ipAddress?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white; 
          padding: 40px 20px;
          text-align: center;
        }
        .logo {
          font-size: 36px;
          font-weight: bold;
          letter-spacing: 2px;
          margin-bottom: 8px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .tagline {
          font-size: 14px;
          opacity: 0.9;
          letter-spacing: 1px;
        }
        .content { 
          padding: 40px 30px;
          background: #ffffff;
        }
        .welcome {
          font-size: 24px;
          color: #667eea;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .message {
          color: #555;
          margin-bottom: 15px;
          line-height: 1.8;
        }
        .otp-box { 
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 30px;
          text-align: center;
          margin: 30px 0;
          border-radius: 12px;
          border: 2px solid #667eea;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
        }
        .otp-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .otp { 
          font-size: 42px;
          font-weight: bold;
          color: #667eea;
          letter-spacing: 12px;
          font-family: 'Courier New', monospace;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        .expiry {
          color: #888;
          margin-top: 15px;
          font-size: 13px;
        }
        .info-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #667eea;
        }
        .info-label {
          font-weight: 600;
          color: #667eea;
          margin-bottom: 5px;
        }
        .footer { 
          padding: 30px;
          text-align: center;
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
        }
        .footer-text {
          color: #666;
          font-size: 13px;
          margin: 5px 0;
        }
        .warning { 
          background: #fff3cd;
          border: 1px solid #ffc107;
          color: #856404;
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
          font-size: 14px;
        }
        .warning-icon {
          font-size: 20px;
          margin-right: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">BYTE-CHAT</div>
          <div class="tagline">IIT Mandi Student Community</div>
        </div>
        <div class="content">
          <div class="welcome">🎉 Welcome Aboard!</div>
          <p class="message">Hello there,</p>
          <p class="message">Your journey with BYTE-CHAT is about to begin! We're excited to have you join the IIT Mandi student community.</p>
          
          <div class="info-box">
            <div class="info-label">Roll Number</div>
            <div>${rollNo}</div>
          </div>

          <p class="message">To complete your registration, please verify your email using the OTP below:</p>
          
          <div class="otp-box">
            <div class="otp-label">Your Verification Code</div>
            <div class="otp">${otp}</div>
            <div class="expiry">⏰ Valid for 15 minutes</div>
          </div>

          ${ipAddress ? `<p style="color: #999; font-size: 12px; text-align: center;">Request initiated from: ${ipAddress}</p>` : ''}
          
          <div class="warning">
            <span class="warning-icon">⚠️</span>
            <strong>Security Notice:</strong> If you didn't create this account, please ignore this email. Your information is safe with us.
          </div>
        </div>
        <div class="footer">
          <p class="footer-text"><strong>BYTE-CHAT</strong> - Connecting IIT Mandi Students</p>
          <p class="footer-text">© ${new Date().getFullYear()} IIT Mandi. All rights reserved.</p>
          <p class="footer-text" style="color: #999; margin-top: 10px;">This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getPasswordResetEmailHTML(otp: string, rollNo: string, ipAddress?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333;
          background: linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%);
          padding: 20px;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .header { 
          background: linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%);
          color: white; 
          padding: 40px 20px;
          text-align: center;
        }
        .logo {
          font-size: 36px;
          font-weight: bold;
          letter-spacing: 2px;
          margin-bottom: 8px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .tagline {
          font-size: 14px;
          opacity: 0.9;
          letter-spacing: 1px;
        }
        .content { 
          padding: 40px 30px;
          background: #ffffff;
        }
        .title {
          font-size: 24px;
          color: #fc4a1a;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .message {
          color: #555;
          margin-bottom: 15px;
          line-height: 1.8;
        }
        .otp-box { 
          background: linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%);
          padding: 30px;
          text-align: center;
          margin: 30px 0;
          border-radius: 12px;
          border: 2px solid #fc4a1a;
          box-shadow: 0 4px 15px rgba(252, 74, 26, 0.2);
        }
        .otp-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .otp { 
          font-size: 42px;
          font-weight: bold;
          color: #fc4a1a;
          letter-spacing: 12px;
          font-family: 'Courier New', monospace;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        .expiry {
          color: #888;
          margin-top: 15px;
          font-size: 13px;
        }
        .info-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #fc4a1a;
        }
        .info-label {
          font-weight: 600;
          color: #fc4a1a;
          margin-bottom: 5px;
        }
        .footer { 
          padding: 30px;
          text-align: center;
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
        }
        .footer-text {
          color: #666;
          font-size: 13px;
          margin: 5px 0;
        }
        .warning { 
          background: #fff3cd;
          border: 1px solid #ffc107;
          color: #856404;
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
          font-size: 14px;
        }
        .warning-icon {
          font-size: 20px;
          margin-right: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">BYTE-CHAT</div>
          <div class="tagline">IIT Mandi Student Community</div>
        </div>
        <div class="content">
          <div class="title">🔐 Password Reset Request</div>
          <p class="message">Hello,</p>
          <p class="message">We received a request to reset your BYTE-CHAT account password.</p>
          
          <div class="info-box">
            <div class="info-label">Account Roll Number</div>
            <div>${rollNo}</div>
          </div>

          <p class="message">Use the verification code below to reset your password:</p>
          
          <div class="otp-box">
            <div class="otp-label">Your Reset Code</div>
            <div class="otp">${otp}</div>
            <div class="expiry">⏰ Valid for 15 minutes</div>
          </div>

          ${ipAddress ? `<p style="color: #999; font-size: 12px; text-align: center;">Request initiated from: ${ipAddress}</p>` : ''}
          
          <div class="warning">
            <span class="warning-icon">⚠️</span>
            <strong>Security Alert:</strong> If you didn't request this password reset, please secure your account immediately and contact support.
          </div>
        </div>
        <div class="footer">
          <p class="footer-text"><strong>BYTE-CHAT</strong> - Connecting IIT Mandi Students</p>
          <p class="footer-text">© ${new Date().getFullYear()} IIT Mandi. All rights reserved.</p>
          <p class="footer-text" style="color: #999; margin-top: 10px;">This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
