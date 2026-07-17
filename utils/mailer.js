/* =========================================
   TTT OUTFIT — RESEND EMAIL SERVICE
========================================= */

const RESEND_API_URL =
  'https://api.resend.com/emails';


/* =========================================
   ENVIRONMENT CONFIGURATION
========================================= */

const resendApiKey =
  process.env.RESEND_API_KEY;

const websiteUrl =
  String(
    process.env.APP_BASE_URL ||
    'https://tttoutfit.bd'
  ).replace(/\/+$/, '');

const adminEmail =
  process.env.ADMIN_EMAIL;

const emailFrom =
  process.env.EMAIL_FROM ||
  'TTT Outfit <orders@tttoutfit.bd>';

const supportEmail =
  process.env.SUPPORT_EMAIL ||
  'support@tttoutfit.bd';


/* =========================================
   SAFE HTML HELPERS
========================================= */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


function money(value) {
  return Number(value || 0)
    .toLocaleString('en-BD');
}


function formatDate(value) {
  const date =
    value
      ? new Date(value)
      : new Date();

  return new Intl.DateTimeFormat(
    'en-BD',
    {
      timeZone: 'Asia/Dhaka',
      dateStyle: 'long',
      timeStyle: 'short'
    }
  ).format(date);
}


function safeValue(value, fallback = 'Not provided') {
  const normalized =
    String(value ?? '').trim();

  return normalized
    ? escapeHtml(normalized)
    : fallback;
}


/* =========================================
   RESEND API REQUEST
========================================= */

async function sendEmail({
  to,
  subject,
  html,
  replyTo
}) {
  if (!resendApiKey) {
    throw new Error(
      'RESEND_API_KEY is missing.'
    );
  }

  if (!to) {
    throw new Error(
      'Email receiver is missing.'
    );
  }

  const response =
    await fetch(
      RESEND_API_URL,
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${resendApiKey}`,

          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          from: emailFrom,
          to: [to],
          subject,
          html,

          ...(replyTo
            ? {
                reply_to:
                  replyTo
              }
            : {})
        })
      }
    );

  const result =
    await response.json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result?.message ||
      `Resend failed with status ${response.status}.`
    );
  }

  return result;
}


/* =========================================
   SHARED EMAIL HEADER
========================================= */

function emailHeader({
  badge,
  title,
  subtitle
}) {
  return `
    <div
      style="
        padding:34px 26px;
        text-align:center;
        background:#101010;
        color:#ffffff;
      "
    >
<table
  role="presentation"
  align="center"
  cellpadding="0"
  cellspacing="0"
  style="
    margin:0 auto 16px;
    border-collapse:collapse;
  "
>
  <tr>
    <td
      style="
        padding-right:10px;
        vertical-align:middle;
      "
    >
      <img
        src="${websiteUrl}/ttt-logo.jpeg"
        alt="TTT Outfit"
        width="46"
        height="46"
        style="
          width:46px;
          height:46px;
          display:block;
          object-fit:cover;
          background:#ffffff;
          border:2px solid #c7a646;
          border-radius:50%;
        "
      >
    </td>

    <td
      style="
        color:#c7a646;
        font-size:15px;
        font-weight:800;
        letter-spacing:2px;
        vertical-align:middle;
        white-space:nowrap;
      "
    >
      TTT OUTFIT
    </td>
  </tr>
</table>

      <div
        style="
          display:inline-block;
          margin-bottom:14px;
          padding:7px 12px;
          color:#171717;
          background:#c7a646;
          border-radius:999px;
          font-size:11px;
          font-weight:800;
          letter-spacing:.6px;
        "
      >
        ${escapeHtml(badge)}
      </div>

      <h1
        style="
          margin:0;
          font-size:27px;
          line-height:1.25;
        "
      >
        ${escapeHtml(title)}
      </h1>

      <p
        style="
          max-width:480px;
          margin:10px auto 0;
          color:#c9c9c9;
          font-size:14px;
          line-height:1.6;
        "
      >
        ${escapeHtml(subtitle)}
      </p>
    </div>
  `;
}


/* =========================================
   INFORMATION CARD
========================================= */

function infoCard({
  icon,
  title,
  rows
}) {
  const rowHtml =
    rows
      .filter(row => row)
      .map(
        row => `
          <tr>
            <td
              style="
                width:43%;
                padding:9px 0;
                color:#777777;
                font-size:13px;
                vertical-align:top;
                border-bottom:1px solid #eee9df;
              "
            >
              ${escapeHtml(row.label)}
            </td>

            <td
              style="
                padding:9px 0;
                color:#151515;
                font-size:13px;
                font-weight:700;
                text-align:right;
                vertical-align:top;
                border-bottom:1px solid #eee9df;
                word-break:break-word;
              "
            >
              ${row.value}
            </td>
          </tr>
        `
      )
      .join('');

  return `
    <div
      style="
        margin-top:20px;
        padding:20px;
        background:#ffffff;
        border:1px solid #e8e1d4;
        border-radius:13px;
      "
    >
      <h2
        style="
          margin:0 0 11px;
          color:#171717;
          font-size:17px;
        "
      >
<span
  style="
    display:inline-flex;
    width:30px;
    height:30px;
    margin-right:9px;
    align-items:center;
    justify-content:center;
    color:#ffffff;
    background:#9b7900;
    border:1px solid #c7a646;
    border-radius:50%;
    font-size:14px;
    font-weight:800;
    line-height:30px;
    text-align:center;
    vertical-align:middle;
  "
>
  ${icon}
</span>

        ${escapeHtml(title)}
      </h2>

      <table
        role="presentation"
        style="
          width:100%;
          border-collapse:collapse;
        "
      >
        ${rowHtml}
      </table>
    </div>
  `;
}


/* =========================================
   ORDER ITEMS TABLE
========================================= */

function orderItemsTable(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return `
      <p
        style="
          margin:0;
          color:#777777;
        "
      >
        No products found.
      </p>
    `;
  }

  const rows =
    items.map(
      (item, index) => {
        const quantity =
          Number(item.quantity || 0);

        const unitPrice =
          Number(item.unitPrice || 0);

        const lineTotal =
          Number(
            item.lineTotal ||
            unitPrice * quantity
          );

        const image =
          String(item.image || '').trim();

        return `
          <tr>
            <td
              style="
                padding:14px 8px 14px 0;
                border-bottom:1px solid #eee9df;
                vertical-align:top;
              "
            >
              ${
                image
                  ? `
                    <img
                      src="${escapeHtml(image)}"
                      alt="${escapeHtml(item.name || 'Product')}"
                      width="60"
                      height="74"
                      style="
                        width:60px;
                        height:74px;
                        display:block;
                        object-fit:cover;
                        border:1px solid #e4ded2;
                        border-radius:7px;
                      "
                    >
                  `
                  : `
                    <div
                      style="
                        width:60px;
                        height:74px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        color:#777777;
                        background:#f0ede6;
                        border-radius:7px;
                        font-size:11px;
                      "
                    >
                      ${index + 1}
                    </div>
                  `
              }
            </td>

            <td
              style="
                padding:14px 8px;
                border-bottom:1px solid #eee9df;
                vertical-align:top;
              "
            >
              <strong
                style="
                  display:block;
                  margin-bottom:5px;
                  color:#161616;
                  font-size:14px;
                "
              >
                ${safeValue(item.name)}
              </strong>

              <span
                style="
                  display:block;
                  color:#777777;
                  font-size:11px;
                  line-height:1.7;
                "
              >
                SKU:
                ${safeValue(item.sku, 'N/A')}
                <br>

                Color:
                ${safeValue(item.color, 'Default')}
                <br>

                Size:
                ${safeValue(item.size, 'One Size')}
              </span>
            </td>

            <td
              style="
                padding:14px 8px;
                border-bottom:1px solid #eee9df;
                text-align:center;
                vertical-align:top;
                font-size:13px;
                font-weight:700;
              "
            >
              ${quantity}
            </td>

            <td
              style="
                padding:14px 0 14px 8px;
                border-bottom:1px solid #eee9df;
                text-align:right;
                vertical-align:top;
              "
            >
              <span
                style="
                  display:block;
                  color:#777777;
                  font-size:11px;
                "
              >
                ৳${money(unitPrice)} each
              </span>

              <strong
                style="
                  display:block;
                  margin-top:5px;
                  color:#151515;
                  font-size:14px;
                "
              >
                ৳${money(lineTotal)}
              </strong>
            </td>
          </tr>
        `;
      }
    ).join('');

  return `
    <div
      style="
        margin-top:20px;
        padding:20px;
        background:#ffffff;
        border:1px solid #e8e1d4;
        border-radius:13px;
      "
    >
      <h2
        style="
          margin:0 0 12px;
          color:#171717;
          font-size:17px;
        "
      >
<span
  style="
    display:inline-flex;
    width:30px;
    height:30px;
    margin-right:9px;
    align-items:center;
    justify-content:center;
    color:#ffffff;
    background:#9b7900;
    border:1px solid #c7a646;
    border-radius:50%;
    font-size:14px;
    font-weight:800;
    line-height:30px;
    text-align:center;
    vertical-align:middle;
  "
>
  ◫
</span>

        Ordered Products
      </h2>

      <table
        role="presentation"
        style="
          width:100%;
          border-collapse:collapse;
        "
      >
        <thead>
          <tr>
            <th></th>

            <th
              style="
                padding:8px;
                color:#777777;
                font-size:10px;
                text-align:left;
                text-transform:uppercase;
              "
            >
              Product
            </th>

            <th
              style="
                padding:8px;
                color:#777777;
                font-size:10px;
                text-align:center;
                text-transform:uppercase;
              "
            >
              Qty
            </th>

            <th
              style="
                padding:8px 0 8px 8px;
                color:#777777;
                font-size:10px;
                text-align:right;
                text-transform:uppercase;
              "
            >
              Total
            </th>
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}


/* =========================================
   ORDER SUMMARY
========================================= */

function orderSummary(order) {
  const discount =
    Number(order.discount || 0);

  return infoCard({
    icon: '৳',

    title: 'Order Summary',

    rows: [
      {
        label: 'Subtotal',
        value:
          `৳${money(order.subtotal)}`
      },

      {
        label: 'Delivery charge',
        value:
          Number(order.deliveryFee || 0) > 0
            ? `৳${money(order.deliveryFee)}`
            : 'Free'
      },

      discount > 0
        ? {
            label:
              order.couponCode
                ? `Discount (${escapeHtml(order.couponCode)})`
                : 'Discount',

            value:
              `- ৳${money(discount)}`
          }
        : null,

      {
        label: 'Grand total',
        value: `
          <span
            style="
              color:#9a781e;
              font-size:18px;
            "
          >
            ৳${money(order.total)}
          </span>
        `
      }
    ]
  });
}


/* =========================================
   ADMIN ORDER EMAIL
========================================= */

async function sendAdminOrderEmail(order) {
  if (!adminEmail) {
    throw new Error(
      'ADMIN_EMAIL is missing.'
    );
  }

  const customer =
    order.customerSnapshot || {};

  const address =
    order.shippingAddress || {};

  const replyTo =
    String(customer.email || '').trim();

  const paymentRows = [
    {
      label: 'Payment method',
      value:
        safeValue(
          order.paymentMethod,
          'COD'
        )
    },

    {
      label: 'Payment status',
      value:
        safeValue(
          order.paymentStatus,
          'Pending'
        )
    },

    order.senderNumber
      ? {
          label: 'Sender number',
          value:
            safeValue(order.senderNumber)
        }
      : null,

    order.transactionId
      ? {
          label: 'Transaction ID',
          value:
            safeValue(order.transactionId)
        }
      : null
  ];

  const adminOrderUrl =
    `${websiteUrl}/admin/orders`;

  const html = `
    <!doctype html>
    <html>
      <body
        style="
          margin:0;
          padding:0;
          background:#f4f1e9;
          color:#222222;
          font-family:Arial,Helvetica,sans-serif;
        "
      >
        <div
          style="
            display:none;
            max-height:0;
            overflow:hidden;
          "
        >
          New order ${escapeHtml(order.orderNumber)}
          from ${safeValue(customer.name)}.
        </div>

        <div
          style="
            width:100%;
            padding:24px 12px;
            box-sizing:border-box;
          "
        >
          <div
            style="
              max-width:720px;
              margin:0 auto;
              overflow:hidden;
              background:#fbfaf7;
              border:1px solid #e5ded0;
              border-radius:16px;
              box-shadow:0 15px 35px rgba(0,0,0,.07);
            "
          >
            ${emailHeader({
              badge:
                'NEW ORDER RECEIVED',

              title:
                `Order ${order.orderNumber}`,

              subtitle:
                'A customer has placed a new order. Review the complete information below.'
            })}

            <div style="padding:24px;">
              ${infoCard({
                icon: '#',

                title: 'Order Information',

                rows: [
                  {
                    label: 'Order number',
                    value:
                      safeValue(
                        order.orderNumber
                      )
                  },

                  {
                    label: 'Placed at',
                    value:
                      safeValue(
                        formatDate(
                          order.createdAt
                        )
                      )
                  },

                  {
                    label: 'Order status',
                    value:
                      safeValue(
                        order.status,
                        'Pending'
                      )
                  },

                  {
                    label: 'Number of items',
                    value:
                      String(
                        (order.items || [])
                          .reduce(
                            (sum, item) =>
                              sum +
                              Number(
                                item.quantity || 0
                              ),
                            0
                          )
                      )
                  }
                ]
              })}

              ${infoCard({
                icon: '●',

                title: 'Customer Information',

                rows: [
                  {
                    label: 'Full name',
                    value:
                      safeValue(customer.name)
                  },

                  {
                    label: 'Phone',
                    value:
                      safeValue(customer.phone)
                  },

                  {
                    label: 'Email',
                    value:
                      safeValue(
                        customer.email
                      )
                  }
                ]
              })}

              ${infoCard({
                icon: '⌂',

                title: 'Delivery Information',

                rows: [
                  {
                    label: 'Country',
                    value:
                      safeValue(
                        address.country,
                        'Bangladesh'
                      )
                  },

                  {
                    label: 'City / District',
                    value:
                      safeValue(address.city)
                  },

                  {
                    label: 'Area',
                    value:
                      safeValue(address.area)
                  },

                  {
                    label: 'Full address',
                    value:
                      safeValue(address.address)
                  },

                  {
                    label: 'Postal code',
                    value:
                      safeValue(
                        address.postalCode,
                        'N/A'
                      )
                  },

                  {
                    label: 'Delivery type',
                    value:
                      safeValue(
                        address.deliveryType,
                        'Standard delivery'
                      )
                  }
                ]
              })}

              ${orderItemsTable(order.items)}

              ${infoCard({
                icon: '৳',

                title: 'Payment Information',

                rows: paymentRows
              })}

              ${orderSummary(order)}

              ${
                String(order.notes || '').trim()
                  ? `
                    <div
                      style="
                        margin-top:20px;
                        padding:20px;
                        background:#fff8df;
                        border:1px solid #ead99c;
                        border-radius:13px;
                      "
                    >
                      <h2
                        style="
                          margin:0 0 8px;
                          font-size:16px;
                        "
                      >
                        Customer Note
                      </h2>

                      <p
                        style="
                          margin:0;
                          color:#55471c;
                          font-size:13px;
                          line-height:1.7;
                        "
                      >
                        ${escapeHtml(order.notes)}
                      </p>
                    </div>
                  `
                  : ''
              }

              <div
                style="
                  margin:26px 0 8px;
                  text-align:center;
                "
              >
                <a
                  href="${adminOrderUrl}"
                  style="
                    display:inline-block;
                    padding:14px 24px;
                    color:#111111;
                    background:#c7a646;
                    border-radius:8px;
                    text-decoration:none;
                    font-size:13px;
                    font-weight:800;
                  "
                >
                  Open Admin Orders
                </a>
              </div>
            </div>

            <div
              style="
                padding:20px 24px;
                color:#999999;
                background:#111111;
                text-align:center;
                font-size:11px;
                line-height:1.7;
              "
            >
              TTT Outfit Order Notification<br>
              ${escapeHtml(websiteUrl)}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: adminEmail,

    subject:
      `New order ${order.orderNumber} — ৳${money(order.total)}`,

    html,

    replyTo:
      replyTo || undefined
  });
}


/* =========================================
   CUSTOMER ORDER CONFIRMATION
========================================= */

async function sendCustomerOrderEmail(order) {
  const customer =
    order.customerSnapshot || {};

  const customerEmail =
    String(customer.email || '').trim();

  if (!customerEmail) {
    return null;
  }

  const address =
    order.shippingAddress || {};

  const html = `
    <!doctype html>
    <html>
      <body
        style="
          margin:0;
          padding:0;
          background:#f4f1e9;
          color:#222222;
          font-family:Arial,Helvetica,sans-serif;
        "
      >
        <div
          style="
            display:none;
            max-height:0;
            overflow:hidden;
          "
        >
          Your TTT Outfit order
          ${escapeHtml(order.orderNumber)}
          has been received.
        </div>

        <div
          style="
            width:100%;
            padding:24px 12px;
            box-sizing:border-box;
          "
        >
          <div
            style="
              max-width:720px;
              margin:0 auto;
              overflow:hidden;
              background:#fbfaf7;
              border:1px solid #e5ded0;
              border-radius:16px;
            "
          >
            ${emailHeader({
              badge:
                'ORDER CONFIRMED',

              title:
                'Thank you for your order',

              subtitle:
                `Hello ${customer.name || 'Customer'}, we have successfully received your order.`
            })}

            <div style="padding:24px;">
              <div
                style="
                  padding:17px 19px;
                  color:#236c3a;
                  background:#eaf7ee;
                  border:1px solid #ccebd5;
                  border-radius:11px;
                  font-size:13px;
                  line-height:1.7;
                "
              >
                <strong>
                  Order placed successfully
                </strong>
                <br>

                Our team will review your order
                and contact you if necessary.
              </div>

              ${infoCard({
                icon: '#',

                title: 'Order Information',

                rows: [
                  {
                    label: 'Order number',
                    value:
                      safeValue(
                        order.orderNumber
                      )
                  },

                  {
                    label: 'Placed at',
                    value:
                      safeValue(
                        formatDate(
                          order.createdAt
                        )
                      )
                  },

                  {
                    label: 'Order status',
                    value:
                      safeValue(
                        order.status,
                        'Pending'
                      )
                  },

                  {
                    label: 'Payment method',
                    value:
                      safeValue(
                        order.paymentMethod,
                        'COD'
                      )
                  },

                  {
                    label: 'Payment status',
                    value:
                      safeValue(
                        order.paymentStatus,
                        'Pending'
                      )
                  }
                ]
              })}

              ${orderItemsTable(order.items)}

              ${orderSummary(order)}

              ${infoCard({
                icon: '⌂',

                title: 'Delivery Address',

                rows: [
                  {
                    label: 'Recipient',
                    value:
                      safeValue(customer.name)
                  },

                  {
                    label: 'Phone',
                    value:
                      safeValue(customer.phone)
                  },

                  {
                    label: 'City / District',
                    value:
                      safeValue(address.city)
                  },

                  {
                    label: 'Area',
                    value:
                      safeValue(address.area)
                  },

                  {
                    label: 'Address',
                    value:
                      safeValue(address.address)
                  },

                  {
                    label: 'Postal code',
                    value:
                      safeValue(
                        address.postalCode,
                        'N/A'
                      )
                  },

                  {
                    label: 'Delivery type',
                    value:
                      safeValue(
                        address.deliveryType,
                        'Standard delivery'
                      )
                  }
                ]
              })}

              ${
                String(order.notes || '').trim()
                  ? `
                    <div
                      style="
                        margin-top:20px;
                        padding:18px;
                        background:#fff8df;
                        border:1px solid #ead99c;
                        border-radius:12px;
                      "
                    >
                      <strong
                        style="
                          display:block;
                          margin-bottom:7px;
                        "
                      >
                        Your note
                      </strong>

                      <span
                        style="
                          color:#55471c;
                          font-size:13px;
                          line-height:1.7;
                        "
                      >
                        ${escapeHtml(order.notes)}
                      </span>
                    </div>
                  `
                  : ''
              }

              <div
                style="
                  margin:27px 0 10px;
                  text-align:center;
                "
              >
                <a
                  href="${websiteUrl}/track-order"
                  style="
                    display:inline-block;
                    margin:5px;
                    padding:14px 22px;
                    color:#111111;
                    background:#c7a646;
                    border-radius:8px;
                    text-decoration:none;
                    font-size:13px;
                    font-weight:800;
                  "
                >
                  Track Your Order
                </a>

                <a
                  href="${websiteUrl}/shop"
                  style="
                    display:inline-block;
                    margin:5px;
                    padding:13px 22px;
                    color:#111111;
                    background:#ffffff;
                    border:1px solid #cfc7b7;
                    border-radius:8px;
                    text-decoration:none;
                    font-size:13px;
                    font-weight:800;
                  "
                >
                  Continue Shopping
                </a>
              </div>

              <p
                style="
                  margin:23px 0 0;
                  color:#777777;
                  font-size:12px;
                  line-height:1.7;
                  text-align:center;
                "
              >
                Need help? Contact us at
                <a
                  href="mailto:${escapeHtml(supportEmail)}"
                  style="
                    color:#9a781e;
                    font-weight:700;
                  "
                >
                  ${escapeHtml(supportEmail)}
                </a>
              </p>
            </div>

            <div
              style="
                padding:20px 24px;
                color:#999999;
                background:#111111;
                text-align:center;
                font-size:11px;
                line-height:1.7;
              "
            >
              Thank you for choosing TTT Outfit.<br>
              Premium fashion for everyday confidence.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: customerEmail,

    subject:
      `Order confirmed — ${order.orderNumber}`,

    html,

    replyTo: supportEmail
  });
}


/* =========================================
   PASSWORD RESET EMAIL
========================================= */

async function sendPasswordResetEmail({
  email,
  name,
  resetUrl
}) {
  const safeName =
    name || 'Customer';

  const html = `
    <!doctype html>
    <html>
      <body
        style="
          margin:0;
          padding:0;
          background:#f4f1e9;
          color:#222222;
          font-family:Arial,Helvetica,sans-serif;
        "
      >
        <div
          style="
            width:100%;
            padding:24px 12px;
            box-sizing:border-box;
          "
        >
          <div
            style="
              max-width:620px;
              margin:0 auto;
              overflow:hidden;
              background:#ffffff;
              border:1px solid #e5ded0;
              border-radius:16px;
            "
          >
            ${emailHeader({
              badge:
                'ACCOUNT SECURITY',

              title:
                'Reset your password',

              subtitle:
                'Use the secure button below to create a new TTT Outfit password.'
            })}

            <div style="padding:30px;">
              <p
                style="
                  margin-top:0;
                  font-size:14px;
                  line-height:1.7;
                "
              >
                Hello
                <strong>
                  ${escapeHtml(safeName)}
                </strong>,
              </p>

              <p
                style="
                  color:#555555;
                  font-size:14px;
                  line-height:1.7;
                "
              >
                We received a request to reset your
                password. This secure link will expire
                in 30 minutes.
              </p>

              <div
                style="
                  margin:28px 0;
                  text-align:center;
                "
              >
                <a
                  href="${escapeHtml(resetUrl)}"
                  style="
                    display:inline-block;
                    padding:14px 24px;
                    color:#111111;
                    background:#c7a646;
                    border-radius:8px;
                    text-decoration:none;
                    font-size:13px;
                    font-weight:800;
                  "
                >
                  Reset Password
                </a>
              </div>

              <p
                style="
                  color:#777777;
                  font-size:12px;
                  line-height:1.7;
                "
              >
                If you did not request this change,
                you can safely ignore this email.
              </p>

              <p
                style="
                  color:#999999;
                  font-size:11px;
                  line-height:1.6;
                  word-break:break-all;
                "
              >
                ${escapeHtml(resetUrl)}
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,

    subject:
      'Reset your TTT Outfit password',

    html,

    replyTo: supportEmail
  });
}


/* =========================================
   EXPORT FUNCTIONS
========================================= */

module.exports = {
  sendAdminOrderEmail,
  sendCustomerOrderEmail,
  sendPasswordResetEmail
};
