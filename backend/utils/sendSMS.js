import twilio from "twilio";

const sanitizePhone = (phone) => phone.replace(/[\s\-\(\)]/g, "");

export const sendRegistrationSMS = async (toPhone, name, otp) => {
    const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    );

    const fromNumber = sanitizePhone(process.env.TWILIO_PHONE_NUMBER);
    const toNumber = sanitizePhone(toPhone);

    console.log(`📱 Sending SMS from: ${fromNumber} → to: ${toNumber}`);

    const message = await client.messages.create({
        body:
            `🎉 Welcome to PhonePay, ${name}!\n\n` +
            `Your account has been successfully registered.\n\n` +
            `Your verification OTP is: ${otp}\n` +
            `This OTP is valid for 10 minutes. Do NOT share it with anyone.\n\n` +
            `– Team PhonePay`,
        from: fromNumber,
        to: toNumber,
    });

    console.log(`✅ Registration SMS sent to ${toNumber} [SID: ${message.sid}]`);
    return message;
};
