const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());

// Fixed CORS configuration - allow both development and production origins
const allowedOrigins = [
  "http://localhost:5173", // Vite dev server
  "http://localhost:3000", // Alternative dev server
  "https://reportifynow.netlify.app" // Production frontend
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const transporter = nodemailer.createTransporter({
  service: "gmail",
  auth: { user: emailUser, pass: emailPass },
});

// Add a health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "Reportify Backend is running!", timestamp: new Date().toISOString() });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Backend is healthy" });
});

// Get all reports
app.get("/api/reports", async (req, res) => {
  try {
    const { data, error } = await supabase.from("reports").select("*");
    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data || []);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add a report
app.post("/api/reports", async (req, res) => {
  try {
    const { date, category, amount, user, region } = req.body;
    
    // Validate required fields
    if (!date || !category || !amount || !user || !region) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    const { data, error } = await supabase
      .from("reports")
      .insert({ date, category, amount: parseFloat(amount), user, region })
      .select();
      
    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }
    
    res.json(data ? data[0] : {});
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Schedule report via email
app.post("/api/schedule-report", async (req, res) => {
  try {
    const { email, reportData } = req.body;
    
    if (!email || !reportData) {
      return res.status(400).json({ error: "Email and report data are required" });
    }
    
    const mailOptions = {
      from: emailUser,
      to: email,
      subject: "Scheduled Report from Reportify",
      text: `Report Data:\n${JSON.stringify(reportData, null, 2)}`,
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email error:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json({ message: "Report scheduled and emailed successfully" });
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;