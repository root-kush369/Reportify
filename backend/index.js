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
  "https://reportifynow.netlify.app", // Production frontend
  "https://reportifynowfrontend.netlify.app" // ADDED
];

// === START OF NEW CODE ===
// Log environment info on startup
console.log(`Starting Reportify backend in ${process.env.NODE_ENV || 'development'} mode`);
console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
console.log(`Supabase URL: ${process.env.SUPABASE_URL ? 'Configured' : 'MISSING'}`);
console.log(`Email user: ${process.env.EMAIL_USER ? 'Configured' : 'MISSING'}`);
// === END OF NEW CODE ===

app.use(cors({
  origin: function (origin, callback) {
    // === START OF NEW CODE ===
    console.log(`Incoming request from origin: ${origin}`);
    // === END OF NEW CODE ===
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // === MODIFIED CODE ===
    if (allowedOrigins.some(allowed => origin.includes(allowed))) {
      callback(null, true);
    } else {
      console.error('Blocked by CORS:', origin);
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

// === FIXED TYPO ===
const transporter = nodemailer.createTransport({ // Was "createTransporter"
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
  // === NEW DEBUG LOG ===
  console.log("GET /api/reports called");
  
  try {
    const { data, error } = await supabase.from("reports").select("*");
    if (error) {
      // === ENHANCED ERROR HANDLING ===
      console.error(`Supabase error: ${error.message}`);
      return res.status(500).json({ 
        error: "Database error",
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
    
    // === NEW DEBUG LOG ===
    console.log(`Returning ${data.length} reports`);
    res.json(data || []);
  } catch (err) {
    // === ENHANCED ERROR HANDLING ===
    console.error(`GET /api/reports error: ${err.message}`);
    res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
});

// Add a report
app.post("/api/reports", async (req, res) => {
  // === NEW DEBUG LOG ===
  console.log("POST /api/reports called with data:", req.body);
  
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
      // === ENHANCED ERROR HANDLING ===
      console.error(`Supabase error: ${error.message}`);
      return res.status(500).json({ 
        error: "Database error",
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
    
    // === NEW DEBUG LOG ===
    console.log("Added new report:", data[0]);
    res.json(data ? data[0] : {});
  } catch (err) {
    // === ENHANCED ERROR HANDLING ===
    console.error(`POST /api/reports error: ${err.message}`);
    res.status(500).json({ 
      error: "Failed to add report",
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
});

// Schedule report via email
app.post("/api/schedule-report", async (req, res) => {
  // === NEW DEBUG LOG ===
  console.log("POST /api/schedule-report called with email:", req.body.email);
  
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
        // === ENHANCED ERROR HANDLING ===
        console.error(`Email error: ${error.message}`);
        return res.status(500).json({ 
          error: "Email failed",
          details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
      }
      
      // === NEW DEBUG LOG ===
      console.log("Email sent successfully:", info.response);
      res.json({ message: "Report scheduled and emailed successfully" });
    });
  } catch (err) {
    // === ENHANCED ERROR HANDLING ===
    console.error(`POST /api/schedule-report error: ${err.message}`);
    res.status(500).json({ 
      error: "Report scheduling failed",
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
});

// === START OF NEW CODE ===
// Global error handler
app.use((err, req, res, next) => {
  console.error(`Global error handler: ${err.message}`);
  res.status(500).json({
    error: "Unexpected server error",
    details: process.env.NODE_ENV !== 'production' ? err.message : undefined
  });
});
// === END OF NEW CODE ===

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;