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

module.exports = {
  sendAdminOrderEmail,
  sendCustomerOrderEmail
};
