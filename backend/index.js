const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
app.use(cors({ origin: "https://reportifynow.netlify.app" })); // Restrict to frontend origin

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: emailUser, pass: emailPass },
});

app.get("/api/reports", async (req, res) => {
  const { data, error } = await supabase.from("reports").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/reports", async (req, res) => {
  const { date, category, amount, user, region } = req.body;
  const { data, error } = await supabase
    .from("reports")
    .insert({ date, category, amount, user, region })
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.post("/api/schedule-report", async (req, res) => {
  const { email, reportData } = req.body;
  const mailOptions = {
    from: emailUser,
    to: email,
    subject: "Scheduled Report from Reportify",
    text: `Report Data:\n${JSON.stringify(reportData, null, 2)}`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Report scheduled and emailed successfully" });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));