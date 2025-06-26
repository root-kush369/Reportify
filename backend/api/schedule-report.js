const nodemailer = require("nodemailer");

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, reportData } = req.body;
  if (!email || !reportData)
    return res.status(400).json({ error: "Email and report data required" });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: emailUser, pass: emailPass }
  });

  const mailOptions = {
    from: emailUser,
    to: email,
    subject: "Scheduled Report from Reportify",
    text: `Report Data:\n${JSON.stringify(reportData, null, 2)}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: "Report scheduled and emailed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};