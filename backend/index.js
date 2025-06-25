// backend/index.js
require("dotenv").config(); // Load .env file
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const nodemailer = require("nodemailer");
const app = express();

app.use(cors());
app.use(express.json());

// Validate and set Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL or SUPABASE_KEY is missing in .env");
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Root route for testing
app.get("/", (req, res) => {
  res.json({ message: "Backend is working!" });
});

// Test route
app.get("/test", (req, res) => {
  res.json({ message: "Test endpoint working!" });
});

// Fetch all reports
app.get("/api/reports", async (req, res) => {
  try {
    const { data, error } = await supabase.from("reports").select("*");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Add a new report
app.post("/api/reports", async (req, res) => {
  try {
    const { date, category, amount, user, region } = req.body;
    const { data, error } = await supabase
      .from("reports")
      .insert({ date, category, amount, user, region })
      .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Schedule a report via email
app.post("/api/schedule-report", async (req, res) => {
  try {
    const { email, reportData } = req.body;
    if (!email || !reportData || !reportData.length) {
      return res.status(400).json({ error: "Email and report data are required" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reportify Scheduled Report",
      text: "Here is your scheduled report:\n\n" + JSON.stringify(reportData, null, 2),
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Report scheduled and emailed successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

// Start server locally (for testing) or export for Vercel
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
} else {
  module.exports = app; // For Vercel
}