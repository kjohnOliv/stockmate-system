export function getOtpEmailSubject() {
  return "StockMate Password Reset OTP";
}

export function getOtpEmailText(otpCode: string) {
  return `Hello,

You requested a password reset for your StockMate Inventory System account. Please use the following One-Time Password (OTP) to proceed:

${otpCode}

This code is valid for the next 10 minutes. If you did not request this, please ignore this message.

Best regards,

The StockMate Team`;
}

export function getOtpEmailHtml(otpCode: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <p>Hello,</p>
      <p>
        You requested a password reset for your <strong>StockMate Inventory System</strong> account.
        Please use the following One-Time Password (OTP) to proceed:
      </p>
      <div style="margin: 24px 0; padding: 16px; background: #eef6df; border: 1px solid #d8e4db; border-radius: 12px; text-align: center;">
        <div style="font-size: 28px; font-weight: 800; letter-spacing: 8px; color: #2f6f4f;">
          ${otpCode}
        </div>
      </div>
      <p>
        This code is valid for the next 10 minutes. If you did not request this, please ignore this message.
      </p>
      <p>Best regards,</p>
      <p><strong>The StockMate Team</strong></p>
    </div>
  `;
}
