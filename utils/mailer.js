const brevo = require('@getbrevo/brevo');

const apiInstance = new brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const sender = {
  name: process.env.BREVO_SENDER_NAME || 'TTT Outfit',
  email: process.env.BREVO_SENDER_EMAIL
};

async function sendAdminOrderEmail(order) {
  const email = new brevo.SendSmtpEmail();

  email.sender = sender;

  email.to = [
    {
      email: process.env.ADMIN_EMAIL
    }
  ];

  email.subject =
    `🛒 New Order - ${order.orderNumber}`;

  email.htmlContent = `
    <h2>New Order Received</h2>

    <p><b>Order No:</b> ${order.orderNumber}</p>

    <p><b>Customer:</b> ${order.customerSnapshot.name}</p>

    <p><b>Phone:</b> ${order.customerSnapshot.phone}</p>

    <p><b>Email:</b> ${order.customerSnapshot.email || '-'}</p>

    <p><b>Total:</b> ৳${order.total}</p>

    <p><b>Payment:</b> ${order.paymentMethod}</p>
  `;

  await apiInstance.sendTransacEmail(email);
}

async function sendCustomerOrderEmail(order) {
  if (!order.customerSnapshot.email) return;

  const email = new brevo.SendSmtpEmail();

  email.sender = sender;

  email.to = [
    {
      email: order.customerSnapshot.email
    }
  ];

  email.subject =
    `Order Confirmation - ${order.orderNumber}`;

  email.htmlContent = `
    <h2>Thank you for shopping with TTT Outfit ❤️</h2>

    <p>Your order has been placed successfully.</p>

    <p>
      <b>Order Number:</b>
      ${order.orderNumber}
    </p>

    <p>
      <b>Total:</b>
      ৳${order.total}
    </p>

    <p>
      We will contact you soon.
    </p>
  `;

  await apiInstance.sendTransacEmail(email);
}
async function sendPasswordResetEmail({
  email,
  name,
  resetUrl
}) {
    console.log(
    '=== sendPasswordResetEmail START ==='
  );

  console.log(
    'Reset email receiver:',
    email
  );

  console.log(
    'Reset URL:',
    resetUrl
  );

  console.log(
    'Brevo sender:',
    sender.email
  );

  console.log(
    'Brevo API key available:',
    Boolean(process.env.BREVO_API_KEY)
  );
  const message =
    new brevo.SendSmtpEmail();

  message.sender = sender;

  message.to = [
    {
      email,
      name: name || 'TTT Outfit Customer'
    }
  ];

  message.subject =
    'Reset Your TTT Outfit Password';
message.textContent = `
Hello ${name},

Reset your password:

${resetUrl}

TTT Outfit
`;
  message.htmlContent = `
    <!doctype html>
    <html>
      <body
        style="
          margin:0;
          padding:0;
          background:#f4f1e9;
          font-family:Arial,sans-serif;
          color:#222;
        "
      >

        <div
          style="
            max-width:620px;
            margin:30px auto;
            background:#ffffff;
            border:1px solid #e4ded0;
            border-radius:16px;
            overflow:hidden;
          "
        >

          <div
            style="
              padding:28px;
              background:#111111;
              color:#ffffff;
              text-align:center;
            "
          >
            <h1 style="margin:0;">
              TTT <span style="color:#c7a646;">OUTFIT</span>
            </h1>
          </div>

          <div style="padding:34px;">

            <h2 style="margin-top:0;">
              Reset your password
            </h2>

            <p>
              Hello ${name || 'Customer'},
            </p>

            <p>
              We received a request to reset your
              TTT Outfit account password.
            </p>

            <p>
              Click the button below to create a new password.
              This link will expire in 30 minutes.
            </p>

            <div
              style="
                margin:30px 0;
                text-align:center;
              "
            >
              <a
                href="${resetUrl}"
                style="
                  display:inline-block;
                  padding:14px 24px;
                  color:#111111;
                  background:#c7a646;
                  border-radius:9px;
                  text-decoration:none;
                  font-weight:700;
                "
              >
                Reset Password
              </a>
            </div>

            <p
              style="
                color:#777777;
                font-size:13px;
                line-height:1.6;
              "
            >
              If you did not request this password reset,
              you can safely ignore this email.
            </p>

            <p
              style="
                color:#999999;
                font-size:12px;
                word-break:break-all;
              "
            >
              ${resetUrl}
            </p>

          </div>

        </div>

      </body>
    </html>
  `;

console.log(
  'Calling Brevo API for reset email...'
);

const result =
  await apiInstance.sendTransacEmail(
    message
  );

console.log(
  'Brevo reset email sent successfully:',
  result?.body?.messageId ||
  result?.response?.body ||
  'Success'
);
}

module.exports = {
  sendAdminOrderEmail,
  sendCustomerOrderEmail,
  sendPasswordResetEmail
};
