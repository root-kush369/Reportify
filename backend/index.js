const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());

// Enhanced CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://reportifynow.netlify.app"
];

// Improved startup logging
console.log(`Starting Reportify backend in ${process.env.NODE_ENV || 'development'} mode`);
console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
console.log(`Supabase URL: ${process.env.SUPABASE_URL ? 'Configured' : 'MISSING'}`);
console.log(`Email user: ${process.env.EMAIL_USER ? 'Configured' : 'MISSING'}`);

// Enhanced CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    console.log(`Incoming request from origin: ${origin}`);
    
    // Extract base domain without protocol or paths
    const getDomain = url => url.replace(/^https?:\/\/([^\/]+).*$/, '$1');
    const originDomain = getDomain(origin);
    
    // Check against all allowed domains
    const isAllowed = allowedOrigins.some(allowed => {
      const allowedDomain = getDomain(allowed);
      return originDomain === allowedDomain;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.error('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Database and email setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// API Routes
app.get("/", (req, res) => {
  res.json({
    message: "Reportify Backend is running!",
    endpoints: {
      health: "/health",
      reports: "/api/reports",
      schedule: "/api/schedule-report"
    },
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "OK",
    message: "Backend is healthy",
    timestamp: new Date().toISOString()
  });
});

// Reports API
app.get("/api/reports", async (req, res) => {
  try {
    const { data, error } = await supabase.from("reports").select("*");
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(`GET /api/reports error: ${err.message}`);
    res.status(500).json({
      error: "Failed to fetch reports",
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
});

app.post("/api/reports", async (req, res) => {
  try {
    const { date, category, amount, user, region } = req.body;
    if (!date || !category || !amount || !user || !region) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const { data, error } = await supabase
      .from("reports")
      .insert({ date, category, amount: parseFloat(amount), user, region })
      .select();
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error(`POST /api/reports error: ${err.message}`);
    res.status(500).json({
      error: "Failed to add report",
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
});

// Schedule Report
app.post("/api/schedule-report", async (req, res) => {
  try {
    const { email, reportData } = req.body;
    if (!email || !reportData) {
      return res.status(400).json({ error: "Email and report data required" });
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Scheduled Report from Reportify",
      text: `Report Data:\n${JSON.stringify(reportData, null, 2)}`,
      html: `<pre>${JSON.stringify(reportData, null, 2)}</pre>`
    });

    res.json({ message: "Report scheduled and emailed successfully" });
  } catch (err) {
    console.error(`POST /api/schedule-report error: ${err.message}`);
    res.status(500).json({
      error: "Failed to schedule report",
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`Global error: ${err.stack}`);
  res.status(500).json({
    error: "Internal server error",
    details: process.env.NODE_ENV !== 'production' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Try these endpoints:
  - http://localhost:${PORT}/
  - http://localhost:${PORT}/health
  - http://localhost:${PORT}/api/reports`
  );
});

module.exports = app;