const { Resend } = require("resend");

async function sendOffenceNotification(driverContact, offenceDetails) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const from =
    process.env.EMAIL_FROM || "TMS NG <notification@info.tmsportalng.tech>";
  const driverEmail = `${driverContact}`;

  const { data, error } = await resend.emails.send({
    from,
    to: [driverEmail],
    subject: "TMS Offence Notification",
    html: `<h1>Offence Notification</h1><p>You received a strike for ${offenceDetails.offence_name}
    by Officer ${offenceDetails.officer_name}</p>`,
    text: "This email was sent using Resend's Node.js SDK.",
  });

  if (error) {
    console.error("Error sending email:", error);
  }

  const emailConfirmation = `Email sent to ${driverContact} regarding offence "${offenceDetails.offence_name}" \n
  Email ID: ${data?.id}`;
  return emailConfirmation;
}

module.exports = { sendOffenceNotification };
