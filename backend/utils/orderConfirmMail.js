import nodemailer from "nodemailer";

// ─── Transporter ──────────────────────────────────────────────────────────────
const createTransporter = () =>
    nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

// ─── HTML Template ────────────────────────────────────────────────────────────
const confirmOrderEmail = (orderData) => {
    const {
        orderId,
        full_name,
        email,
        phone,
        street,
        city,
        state,
        zipCode,
        country,
        paymentMethod,
        paymentStatus,
        status,
        shippingMethod,
        shippingRate,
        taxAmount,
        discountAmount,
        totalAmount,
        items = [],
    } = orderData;

    // Build product rows dynamically
    const itemRows = items.map((item) => `
        <tr>
            <td>
                <div class="product-name">${item.name}</div>
                <div class="product-sku">ID: ${item.productId}</div>
            </td>
            <td>${item.quantity}</td>
            <td class="price-cell">₹${Number(item.price).toFixed(2)}</td>
            <td class="total-cell">₹${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join("");

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background-color: #f4f7fb;
            font-family: 'Segoe UI', 'Inter', -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            padding: 30px 0;
        }
        .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 32px;
            box-shadow: 0 20px 35px -12px rgba(0,0,0,0.08), 0 2px 5px rgba(0,0,0,0.02);
            overflow: hidden;
        }
        .email-header {
            background: linear-gradient(135deg, #1e2b3c 0%, #0f212f 100%);
            padding: 32px 32px 28px;
            text-align: center;
            color: white;
        }
        .checkmark-badge {
            background-color: rgba(255,255,255,0.15);
            width: 56px; height: 56px;
            border-radius: 40px;
            display: inline-flex;
            align-items: center; justify-content: center;
            margin-bottom: 18px;
        }
        .checkmark-badge svg { width: 32px; height: 32px; }
        .email-header h1 { font-size: 26px; font-weight: 700; margin-bottom: 6px; }
        .order-number {
            font-size: 14px;
            background: rgba(255,255,255,0.2);
            display: inline-block;
            padding: 6px 18px;
            border-radius: 40px;
            font-weight: 500;
            margin-top: 10px;
        }
        .content { padding: 28px 32px 38px; }
        .section-title {
            font-size: 17px; font-weight: 700; color: #1e2b3c;
            margin-bottom: 14px;
            border-left: 4px solid #2c7a4d;
            padding-left: 14px;
        }
        .info-card {
            background: #f9fafc;
            border-radius: 20px;
            padding: 18px 22px;
            margin-bottom: 28px;
            border: 1px solid #edf2f7;
        }
        .info-row { display: flex; flex-wrap: wrap; margin-bottom: 12px; font-size: 14px; }
        .info-label { width: 130px; font-weight: 600; color: #2c3e50; }
        .info-value { flex: 1; color: #1f2d3d; }
        .badge {
            display: inline-block;
            padding: 3px 12px;
            border-radius: 30px;
            font-size: 12px;
            font-weight: 600;
            text-transform: capitalize;
        }
        .badge-pending  { background: #fff7e6; color: #d97706; }
        .badge-completed { background: #e6f7ec; color: #1f7840; }
        .badge-failed   { background: #fdecea; color: #c0392b; }
        .badge-cancelled { background: #f3f4f6; color: #6b7280; }
        .product-table-container {
            overflow-x: auto;
            margin-bottom: 24px;
            border-radius: 16px;
            border: 1px solid #eef2f8;
        }
        .product-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 260px; }
        .product-table th {
            text-align: left; padding: 14px 14px 10px;
            background-color: #f8fafd; font-weight: 600;
            color: #1f2d3d; border-bottom: 1px solid #e2e8f0; font-size: 12px;
            text-transform: uppercase; letter-spacing: 0.4px;
        }
        .product-table td { padding: 14px; border-bottom: 1px solid #edf2f7; vertical-align: middle; color: #2d3e50; }
        .product-name { font-weight: 600; color: #0f2b3b; }
        .product-sku { font-size: 11px; color: #6c7a8e; display: block; margin-top: 3px; }
        .price-cell { font-weight: 500; white-space: nowrap; }
        .total-cell { font-weight: 700; color: #1e2b3c; }
        .summary-box {
            background: #fefaf5;
            border-radius: 20px;
            padding: 16px 22px;
            margin: 20px 0;
            border: 1px solid #ffe8d9;
        }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
        .summary-row.final {
            border-top: 2px dashed #e2dcd5;
            margin-top: 8px; padding-top: 12px;
            font-weight: 800; font-size: 17px; color: #1e2b3c;
        }
        .footer-note {
            margin-top: 28px; padding-top: 22px;
            text-align: center;
            border-top: 1px solid #eef2f8;
            font-size: 13px; color: #6c7c90;
        }
        .footer-note p { margin-top: 6px; }
        @media only screen and (max-width: 560px) {
            .content { padding: 20px 20px 28px; }
            .info-label { width: 100px; }
        }
    </style>
</head>
<body>
<div class="email-wrapper">
    <!-- Header -->
    <div class="email-header">
        <div class="checkmark-badge">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <h1>Order Confirmed! 🎉</h1>
        <p style="opacity:0.85; margin-top:6px; font-size:14px;">Thank you for shopping with PhonePay</p>
        <div class="order-number">Order #${orderId}</div>
    </div>

    <div class="content">
        <!-- Customer Details -->
        <div class="section-title">📦 Customer Details</div>
        <div class="info-card">
            <div class="info-row">
                <div class="info-label">Full Name</div>
                <div class="info-value">${full_name}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Email</div>
                <div class="info-value">${email}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Phone</div>
                <div class="info-value">${phone}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Address</div>
                <div class="info-value">${street}, ${city}, ${state} - ${zipCode}, ${country}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Payment</div>
                <div class="info-value" style="text-transform:uppercase;">${paymentMethod} &nbsp; <span class="badge badge-${paymentStatus}">${paymentStatus}</span></div>
            </div>
            <div class="info-row" style="margin-bottom:0;">
                <div class="info-label">Order Status</div>
                <div class="info-value"><span class="badge badge-${status}">${status}</span></div>
            </div>
        </div>

        <!-- Order Items -->
        <div class="section-title">🛍️ Order Items</div>
        <div class="product-table-container">
            <table class="product-table" cellpadding="0" cellspacing="0">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                </tbody>
            </table>
        </div>

        <!-- Order Summary -->
        <div class="summary-box">
            <div class="summary-row"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
            <div class="summary-row"><span>Shipping (${shippingMethod})</span><span>₹${Number(shippingRate).toFixed(2)}</span></div>
            <div class="summary-row"><span>Tax</span><span>₹${Number(taxAmount).toFixed(2)}</span></div>
            ${discountAmount > 0 ? `<div class="summary-row"><span>Discount</span><span>-₹${Number(discountAmount).toFixed(2)}</span></div>` : ""}
            <div class="summary-row final"><span>Total Charged</span><span>₹${Number(totalAmount).toFixed(2)}</span></div>
        </div>

        <!-- Footer -->
        <div class="footer-note">
            <p style="font-weight:500;">✨ Need help? We're here for you 24/7.</p>
            <p style="margin-top:14px; font-size:12px;">© ${new Date().getFullYear()} PhonePay · 30-day returns · support@phonepay.com</p>
        </div>
    </div>
</div>
</body>
</html>`;
};

// ─── Send Function ────────────────────────────────────────────────────────────
export const sendOrderConfirmMail = async (toEmail, orderData) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: `"PhonePay" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `Order Confirmed ✅ – Order #${orderData.orderId}`,
        html: confirmOrderEmail(orderData),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Order confirmation email sent to ${toEmail} [MessageId: ${info.messageId}]`);
    return info;
};