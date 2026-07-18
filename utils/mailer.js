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
  'TTT Outfit <noreply@tttoutfit.bd>';

const supportEmail =
  process.env.SUPPORT_EMAIL ||
  'support@tttoutfit.bd';


/* =========================================
   EMAIL ICONS
========================================= */

const EMAIL_ICONS = {
  order:
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f4cb.png',

  customer:
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f464.png',

  delivery:
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f4cd.png',

  products:
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f6cd.png',

  payment:
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f4b3.png',

  summary:
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f4b0.png',

  security:
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f512.png'
};


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


function safeValue(
  value,
  fallback = 'Not provided'
) {
  const normalized =
    String(value ?? '').trim();

  return normalized
    ? escapeHtml(normalized)
    : fallback;
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

  try {
    return new Intl.DateTimeFormat(
      'en-BD',
      {
        timeZone: 'Asia/Dhaka',
        dateStyle: 'long',
        timeStyle: 'short'
      }
    ).format(date);
  } catch (error) {
    return date.toLocaleString();
  }
}


function getAbsoluteImageUrl(image) {
  const value =
    String(image || '').trim();

  if (!value) {
    return '';
  }

  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value;
  }

  return `${websiteUrl}/${value.replace(/^\/+/, '')}`;
}


/* =========================================
   SEND EMAIL USING RESEND
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

  const body = {
    from: emailFrom,
    to: [to],
    subject,
    html
  };

  if (replyTo) {
    body.reply_to = replyTo;
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

        body:
          JSON.stringify(body)
      }
    );

  const result =
    await response
      .json()
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
   EMAIL PAGE WRAPPER
========================================= */

function emailPage({
  previewText = '',
  content,
  footerText =
    'Premium fashion for everyday confidence.'
}) {
  return `
    <!doctype html>

    <html lang="en">
      <head>
        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <meta
          name="color-scheme"
          content="light"
        >

        <title>TTT Outfit</title>
      </head>

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
            opacity:0;
            color:transparent;
          "
        >
          ${escapeHtml(previewText)}
        </div>

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="
            width:100%;
            background:#f4f1e9;
            border-collapse:collapse;
          "
        >
          <tr>
            <td
              align="center"
              style="
                padding:24px 12px;
              "
            >
              <table
                role="presentation"
                width="720"
                cellpadding="0"
                cellspacing="0"
                style="
                  width:100%;
                  max-width:720px;
                  overflow:hidden;
                  background:#fbfaf7;
                  border:1px solid #e5ded0;
                  border-radius:16px;
                  border-collapse:separate;
                "
              >
                <tr>
                  <td>
                    ${content}
                  </td>
                </tr>

                <tr>
                  <td
                    align="center"
                    style="
                      padding:22px 24px;
                      color:#999999;
                      background:#111111;
                      font-size:11px;
                      line-height:1.7;
                    "
                  >
                    <strong
                      style="
                        color:#c7a646;
                        letter-spacing:1px;
                      "
                    >
                      TTT OUTFIT
                    </strong>

                    <br>

                    ${escapeHtml(footerText)}

                    <br>

                    <a
                      href="${websiteUrl}"
                      style="
                        color:#c7a646;
                        text-decoration:none;
                      "
                    >
                      ${escapeHtml(websiteUrl)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}


/* =========================================
   EMAIL HEADER WITH LOGO
========================================= */

function emailHeader({
  badge,
  title,
  subtitle
}) {
  return `
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="
        width:100%;
        background:#101010;
        border-collapse:collapse;
      "
    >
      <tr>
        <td
          align="center"
          style="
            padding:34px 24px;
            color:#ffffff;
            text-align:center;
          "
        >
          <table
            role="presentation"
            align="center"
            cellpadding="0"
            cellspacing="0"
            style="
              margin:0 auto 18px;
              border-collapse:collapse;
            "
          >
            <tr>
              <td
                valign="middle"
                style="
                  padding-right:10px;
                  vertical-align:middle;
                "
              >
                <img
                  src="${websiteUrl}/ttt-logo.jpeg"
                  alt="TTT Outfit"
                  width="48"
                  height="48"
                  style="
                    width:48px;
                    height:48px;
                    display:block;
                    object-fit:cover;
                    background:#ffffff;
                    border:2px solid #c7a646;
                    border-radius:50%;
                  "
                >
              </td>

              <td
                valign="middle"
                style="
                  color:#ffffff;
                  font-size:17px;
                  font-weight:800;
                  letter-spacing:1.4px;
                  vertical-align:middle;
                  white-space:nowrap;
                "
              >
                TTT

                <span
                  style="
                    color:#c7a646;
                  "
                >
                  OUTFIT
                </span>
              </td>
            </tr>
          </table>

          <div
            style="
              display:inline-block;
              margin-bottom:15px;
              padding:7px 13px;
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
              color:#ffffff;
              font-size:27px;
              line-height:1.3;
            "
          >
            ${escapeHtml(title)}
          </h1>

          <p
            style="
              max-width:500px;
              margin:10px auto 0;
              color:#c9c9c9;
              font-size:14px;
              line-height:1.65;
            "
          >
            ${escapeHtml(subtitle)}
          </p>
        </td>
      </tr>
    </table>
  `;
}


/* =========================================
   SECTION TITLE WITH SAFE ICON
========================================= */

function sectionTitle({
  iconUrl,
  title
}) {
  return `
    <table
      role="presentation"
      cellpadding="0"
      cellspacing="0"
      style="
        width:100%;
        margin:0 0 14px;
        border-collapse:collapse;
      "
    >
      <tr>
        <td
          width="42"
          valign="middle"
          style="
            width:42px;
            vertical-align:middle;
          "
        >
          <table
            role="presentation"
            cellpadding="0"
            cellspacing="0"
            style="
              width:38px;
              height:38px;
              border-collapse:separate;
            "
          >
            <tr>
              <td
                width="38"
                height="38"
                align="center"
                valign="middle"
                style="
                  width:38px;
                  height:38px;
                  padding:0;
                  background:#9b7900;
                  border:1px solid #c7a646;
                  border-radius:50%;
                  text-align:center;
                  vertical-align:middle;
                "
              >
                <img
                  src="${escapeHtml(iconUrl)}"
                  alt=""
                  width="20"
                  height="20"
                  style="
                    width:20px;
                    height:20px;
                    display:block;
                    margin:0 auto;
                    padding:0;
                    border:0;
                  "
                >
              </td>
            </tr>
          </table>
        </td>

        <td
          valign="middle"
          style="
            padding-left:10px;
            color:#171717;
            font-size:17px;
            font-weight:700;
            line-height:1.3;
            vertical-align:middle;
          "
        >
          ${escapeHtml(title)}
        </td>
      </tr>
    </table>
  `;
}


/* =========================================
   INFORMATION CARD
========================================= */

function infoCard({
  iconUrl,
  title,
  rows
}) {
  const validRows =
    Array.isArray(rows)
      ? rows.filter(Boolean)
      : [];

  const rowsHtml =
    validRows
      .map(
        row => `
          <tr>
            <td
              style="
                width:43%;
                padding:10px 0;
                color:#777777;
                font-size:13px;
                line-height:1.5;
                vertical-align:top;
                border-bottom:1px solid #eee9df;
              "
            >
              ${escapeHtml(row.label)}
            </td>

            <td
              style="
                padding:10px 0 10px 12px;
                color:#151515;
                font-size:13px;
                font-weight:700;
                line-height:1.5;
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
      ${sectionTitle({
        iconUrl,
        title
      })}

      <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="
          width:100%;
          border-collapse:collapse;
        "
      >
        ${rowsHtml}
      </table>
    </div>
  `;
}


/* =========================================
   ORDER ITEMS TABLE
========================================= */

function orderItemsTable(items = []) {
  if (
    !Array.isArray(items) ||
    !items.length
  ) {
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
        ${sectionTitle({
          iconUrl: EMAIL_ICONS.products,
          title: 'Ordered Products'
        })}

        <p
          style="
            margin:0;
            color:#777777;
            font-size:13px;
          "
        >
          No products found.
        </p>
      </div>
    `;
  }

  const rows =
    items
      .map(
        (item, index) => {
          const quantity =
            Number(item.quantity || 0);

          const unitPrice =
            Number(
              item.unitPrice ||
              item.price ||
              0
            );

          const lineTotal =
            Number(
              item.lineTotal ||
              unitPrice * quantity
            );

          const image =
            getAbsoluteImageUrl(
              item.image
            );

          return `
            <tr>
              <td
                width="70"
                valign="top"
                style="
                  width:70px;
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
                          background:#f0ede6;
                          border:1px solid #e4ded2;
                          border-radius:7px;
                        "
                      >
                    `
                    : `
                      <table
                        role="presentation"
                        width="60"
                        height="74"
                        cellpadding="0"
                        cellspacing="0"
                        style="
                          width:60px;
                          height:74px;
                          background:#f0ede6;
                          border-radius:7px;
                          border-collapse:separate;
                        "
                      >
                        <tr>
                          <td
                            align="center"
                            valign="middle"
                            style="
                              color:#777777;
                              font-size:12px;
                              text-align:center;
                              vertical-align:middle;
                            "
                          >
                            ${index + 1}
                          </td>
                        </tr>
                      </table>
                    `
                }
              </td>

              <td
                valign="top"
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
                    line-height:1.4;
                  "
                >
                  ${safeValue(
                    item.name,
                    'Product'
                  )}
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
                  ${safeValue(
                    item.sku,
                    'N/A'
                  )}

                  <br>

                  Color:
                  ${safeValue(
                    item.color,
                    'Default'
                  )}

                  <br>

                  Size:
                  ${safeValue(
                    item.size,
                    'One Size'
                  )}
                </span>
              </td>

              <td
                width="45"
                align="center"
                valign="top"
                style="
                  width:45px;
                  padding:14px 7px;
                  border-bottom:1px solid #eee9df;
                  color:#151515;
                  font-size:13px;
                  font-weight:700;
                  text-align:center;
                  vertical-align:top;
                "
              >
                ${quantity}
              </td>

              <td
                width="90"
                align="right"
                valign="top"
                style="
                  width:90px;
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
                    white-space:nowrap;
                  "
                >
                  ৳${money(unitPrice)}
                </span>

                <strong
                  style="
                    display:block;
                    margin-top:5px;
                    color:#151515;
                    font-size:14px;
                    white-space:nowrap;
                  "
                >
                  ৳${money(lineTotal)}
                </strong>
              </td>
            </tr>
          `;
        }
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
      ${sectionTitle({
        iconUrl: EMAIL_ICONS.products,
        title: 'Ordered Products'
      })}

      <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="
          width:100%;
          border-collapse:collapse;
        "
      >
        <thead>
          <tr>
            <th
              width="70"
              style="
                width:70px;
              "
            >
            </th>

            <th
              align="left"
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
              width="45"
              align="center"
              style="
                width:45px;
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
              width="90"
              align="right"
              style="
                width:90px;
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
    iconUrl:
      EMAIL_ICONS.summary,

    title:
      'Order Summary',

    rows: [
      {
        label:
          'Subtotal',

        value:
          `৳${money(order.subtotal)}`
      },

      {
        label:
          'Delivery charge',

        value:
          Number(
            order.deliveryFee || 0
          ) > 0
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
        label:
          'Grand total',

        value: `
          <span
            style="
              color:#9a781e;
              font-size:18px;
              font-weight:800;
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
   CUSTOMER NOTE
========================================= */

function noteCard({
  title,
  note
}) {
  const value =
    String(note || '').trim();

  if (!value) {
    return '';
  }

  return `
    <div
      style="
        margin-top:20px;
        padding:19px;
        background:#fff8df;
        border:1px solid #ead99c;
        border-radius:12px;
      "
    >
      <strong
        style="
          display:block;
          margin-bottom:8px;
          color:#3d3213;
          font-size:15px;
        "
      >
        ${escapeHtml(title)}
      </strong>

      <span
        style="
          color:#55471c;
          font-size:13px;
          line-height:1.7;
        "
      >
        ${escapeHtml(value)}
      </span>
    </div>
  `;
}


/* =========================================
   EMAIL BUTTON
========================================= */

function emailButton({
  url,
  text,
  secondary = false
}) {
  return `
    <a
      href="${escapeHtml(url)}"
      style="
        display:inline-block;
        margin:5px;
        padding:14px 22px;
        color:#111111;
        background:${
          secondary
            ? '#ffffff'
            : '#c7a646'
        };
        border:1px solid ${
          secondary
            ? '#cfc7b7'
            : '#c7a646'
        };
        border-radius:8px;
        text-decoration:none;
        font-size:13px;
        font-weight:800;
      "
    >
      ${escapeHtml(text)}
    </a>
  `;
}


/* =========================================
   ADMIN ORDER EMAIL
========================================= */

async function sendAdminOrderEmail(
  order
) {
  if (!adminEmail) {
    throw new Error(
      'ADMIN_EMAIL is missing.'
    );
  }

  const customer =
    order.customerSnapshot || {};

  const address =
    order.shippingAddress || {};

  const customerEmail =
    String(
      customer.email || ''
    ).trim();

  const itemCount =
    Array.isArray(order.items)
      ? order.items.reduce(
          (total, item) =>
            total +
            Number(
              item.quantity || 0
            ),
          0
        )
      : 0;

  const paymentRows = [
    {
      label:
        'Payment method',

      value:
        safeValue(
          order.paymentMethod,
          'COD'
        )
    },

    {
      label:
        'Payment status',

      value:
        safeValue(
          order.paymentStatus,
          'Pending'
        )
    },

    order.senderNumber
      ? {
          label:
            'Sender number',

          value:
            safeValue(
              order.senderNumber
            )
        }
      : null,

    order.transactionId
      ? {
          label:
            'Transaction ID',

          value:
            safeValue(
              order.transactionId
            )
        }
      : null
  ];

  const content = `
    ${emailHeader({
      badge:
        'NEW ORDER RECEIVED',

      title:
        `Order ${order.orderNumber}`,

      subtitle:
        'A customer has placed a new order. Review the complete information below.'
    })}

    <div
      style="
        padding:24px;
      "
    >
      ${infoCard({
        iconUrl:
          EMAIL_ICONS.order,

        title:
          'Order Information',

        rows: [
          {
            label:
              'Order number',

            value:
              safeValue(
                order.orderNumber
              )
          },

          {
            label:
              'Placed at',

            value:
              safeValue(
                formatDate(
                  order.createdAt
                )
              )
          },

          {
            label:
              'Order status',

            value:
              safeValue(
                order.status,
                'Pending'
              )
          },

          {
            label:
              'Number of items',

            value:
              String(itemCount)
          }
        ]
      })}

      ${infoCard({
        iconUrl:
          EMAIL_ICONS.customer,

        title:
          'Customer Information',

        rows: [
          {
            label:
              'Full name',

            value:
              safeValue(
                customer.name
              )
          },

          {
            label:
              'Phone',

            value:
              safeValue(
                customer.phone
              )
          },

          {
            label:
              'Email',

            value:
              safeValue(
                customer.email
              )
          }
        ]
      })}

      ${infoCard({
        iconUrl:
          EMAIL_ICONS.delivery,

        title:
          'Delivery Information',

        rows: [
          {
            label:
              'Country',

            value:
              safeValue(
                address.country,
                'Bangladesh'
              )
          },

          {
            label:
              'City / District',

            value:
              safeValue(
                address.city
              )
          },

          {
            label:
              'Area',

            value:
              safeValue(
                address.area
              )
          },

          {
            label:
              'Full address',

            value:
              safeValue(
                address.address
              )
          },

          {
            label:
              'Postal code',

            value:
              safeValue(
                address.postalCode,
                'N/A'
              )
          },

          {
            label:
              'Delivery type',

            value:
              safeValue(
                address.deliveryType,
                'Standard delivery'
              )
          }
        ]
      })}

      ${orderItemsTable(
        order.items
      )}

      ${infoCard({
        iconUrl:
          EMAIL_ICONS.payment,

        title:
          'Payment Information',

        rows:
          paymentRows
      })}

      ${orderSummary(order)}

      ${noteCard({
        title:
          'Customer Note',

        note:
          order.notes
      })}

      <div
        style="
          margin:27px 0 8px;
          text-align:center;
        "
      >
        ${emailButton({
          url:
            `${websiteUrl}/admin/orders`,

          text:
            'Open Admin Orders'
        })}
      </div>
    </div>
  `;

  const html =
    emailPage({
      previewText:
        `New order ${order.orderNumber} from ${customer.name || 'customer'}.`,

      content,

      footerText:
        'Admin order notification from TTT Outfit.'
    });

  return sendEmail({
    to:
      adminEmail,

    subject:
      `New order ${order.orderNumber} — ৳${money(order.total)}`,

    html,

    replyTo:
      customerEmail ||
      undefined
  });
}


/* =========================================
   CUSTOMER ORDER CONFIRMATION
========================================= */

async function sendCustomerOrderEmail(
  order
) {
  const customer =
    order.customerSnapshot || {};

  const customerEmail =
    String(
      customer.email || ''
    ).trim();

  if (!customerEmail) {
    return null;
  }

  const address =
    order.shippingAddress || {};

  const content = `
    ${emailHeader({
      badge:
        'ORDER CONFIRMED',

      title:
        'Thank you for your order',

      subtitle:
        `Hello ${customer.name || 'Customer'}, we have successfully received your order.`
    })}

    <div
      style="
        padding:24px;
      "
    >
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
        iconUrl:
          EMAIL_ICONS.order,

        title:
          'Order Information',

        rows: [
          {
            label:
              'Order number',

            value:
              safeValue(
                order.orderNumber
              )
          },

          {
            label:
              'Placed at',

            value:
              safeValue(
                formatDate(
                  order.createdAt
                )
              )
          },

          {
            label:
              'Order status',

            value:
              safeValue(
                order.status,
                'Pending'
              )
          },

          {
            label:
              'Payment method',

            value:
              safeValue(
                order.paymentMethod,
                'COD'
              )
          },

          {
            label:
              'Payment status',

            value:
              safeValue(
                order.paymentStatus,
                'Pending'
              )
          }
        ]
      })}

      ${orderItemsTable(
        order.items
      )}

      ${orderSummary(order)}

      ${infoCard({
        iconUrl:
          EMAIL_ICONS.delivery,

        title:
          'Delivery Address',

        rows: [
          {
            label:
              'Recipient',

            value:
              safeValue(
                customer.name
              )
          },

          {
            label:
              'Phone',

            value:
              safeValue(
                customer.phone
              )
          },

          {
            label:
              'Country',

            value:
              safeValue(
                address.country,
                'Bangladesh'
              )
          },

          {
            label:
              'City / District',

            value:
              safeValue(
                address.city
              )
          },

          {
            label:
              'Area',

            value:
              safeValue(
                address.area
              )
          },

          {
            label:
              'Address',

            value:
              safeValue(
                address.address
              )
          },

          {
            label:
              'Postal code',

            value:
              safeValue(
                address.postalCode,
                'N/A'
              )
          },

          {
            label:
              'Delivery type',

            value:
              safeValue(
                address.deliveryType,
                'Standard delivery'
              )
          }
        ]
      })}

      ${noteCard({
        title:
          'Your Note',

        note:
          order.notes
      })}

      <div
        style="
          margin:27px 0 10px;
          text-align:center;
        "
      >
        ${emailButton({
          url:
            `${websiteUrl}/track-order`,

          text:
            'Track Your Order'
        })}

        ${emailButton({
          url:
            `${websiteUrl}/shop`,

          text:
            'Continue Shopping',

          secondary:
            true
        })}
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
  `;

  const html =
    emailPage({
      previewText:
        `Your TTT Outfit order ${order.orderNumber} has been received.`,

      content,

      footerText:
        'Thank you for choosing TTT Outfit.'
    });

  return sendEmail({
    to:
      customerEmail,

    subject:
      `Order confirmed — ${order.orderNumber}`,

    html,

    replyTo:
      supportEmail
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
  if (!email) {
    throw new Error(
      'Password reset email is missing.'
    );
  }

  if (!resetUrl) {
    throw new Error(
      'Password reset URL is missing.'
    );
  }

  const safeName =
    name || 'Customer';

  const content = `
    ${emailHeader({
      badge:
        'ACCOUNT SECURITY',

      title:
        'Reset your password',

      subtitle:
        'Use the secure button below to create a new TTT Outfit password.'
    })}

    <div
      style="
        padding:30px;
      "
    >
      ${sectionTitle({
        iconUrl:
          EMAIL_ICONS.security,

        title:
          'Password Reset Request'
      })}

      <p
        style="
          margin:20px 0 0;
          color:#222222;
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
        We received a request to reset
        your TTT Outfit password.
        Use the button below to create
        a new password.
      </p>

      <p
        style="
          color:#555555;
          font-size:14px;
          line-height:1.7;
        "
      >
        This secure link will expire
        in 30 minutes.
      </p>

      <div
        style="
          margin:28px 0;
          text-align:center;
        "
      >
        ${emailButton({
          url:
            resetUrl,

          text:
            'Reset Password'
        })}
      </div>

      <div
        style="
          padding:16px;
          background:#f7f4ed;
          border:1px solid #e7e0d3;
          border-radius:10px;
        "
      >
        <p
          style="
            margin:0;
            color:#777777;
            font-size:12px;
            line-height:1.7;
          "
        >
          If you did not request this
          password reset, you can safely
          ignore this email.
        </p>
      </div>

      <p
        style="
          margin:22px 0 0;
          color:#999999;
          font-size:11px;
          line-height:1.6;
          word-break:break-all;
        "
      >
        ${escapeHtml(resetUrl)}
      </p>
    </div>
  `;

  const html =
    emailPage({
      previewText:
        'Reset your TTT Outfit password.',

      content,

      footerText:
        'TTT Outfit account security notification.'
    });

  return sendEmail({
    to:
      email,

    subject:
      'Reset your TTT Outfit password',

    html,

    replyTo:
      supportEmail
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
