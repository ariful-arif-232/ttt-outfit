const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },

  requireTLS: true,

  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 30000
});
async function verifyMailConnection() {
  try {
    await transporter.verify();

    console.log(
      'SMTP connection is ready.'
    );
  } catch (error) {
    console.error(
      'SMTP verification failed:',
      error
    );
  }
}

verifyMailConnection();

async function sendAdminOrderEmail(order) {
  await transporter.sendMail({
    from: `"TTT Outfit" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `🛒 New Order ${order.orderNumber}`,
    html: `
      <h2>New Order Received</h2>

      <p><b>Order:</b> ${order.orderNumber}</p>

      <p><b>Name:</b> ${order.customerSnapshot.name}</p>

      <p><b>Phone:</b> ${order.customerSnapshot.phone}</p>

      <p><b>Email:</b> ${order.customerSnapshot.email || '-'}</p>

      <p><b>Total:</b> ৳${order.total}</p>

      <p><b>Payment:</b> ${order.paymentMethod}</p>
    `
  });
}

async function sendCustomerOrderEmail(order) {

  if (!order.customerSnapshot.email) return;

  await transporter.sendMail({

    from: `"TTT Outfit" <${process.env.SMTP_USER}>`,

    to: order.customerSnapshot.email,

    subject: `Order Confirmation - ${order.orderNumber}`,

    html: `
      <h2>Thank you for shopping with TTT Outfit ❤️</h2>

      <p>Your order has been placed successfully.</p>

      <p><b>Order Number:</b> ${order.orderNumber}</p>

      <p><b>Total:</b> ৳${order.total}</p>

      <p>We will contact you soon.</p>
    `
  });

}

module.exports = {
  sendAdminOrderEmail,
  sendCustomerOrderEmail
};
