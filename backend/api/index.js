require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {createClient} = require("@supabase/supabase-js");
const nodemailer = require("nodemailer");
const app = express();

app.use(cors({origin: "http://localhost:5173"}));
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Fetch all reports
app.get("/api/reports", async (req, res) => {
    const {data, error} = await supabase.from("reports").select("*");
    if (error) return res.status(500).json({error: error.message});
    res.json(data || []);
});

// Add a new report
app.post("/api/reports", async (req, res) => {
    const {date, category, amount, user, region} = req.body;
    const {data, error} = await supabase.from("reports").insert({date, category, amount, user: user, region}).select();
    if (error) return res.status(500).json({error: error.message});
    res.json(data[0]);
});

// Schedule a report via email
app.post("/api/schedule-report", async (req, res) => {
    const {email, reportData} = req.body;
    if (!email || !reportData || !reportData.length) {
        return res.status(400).json({error: "Email and report data are required"});
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS},
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Reportify Scheduled Report",
        text: "Here is your scheduled report:\n\n" + JSON.stringify(reportData, null, 2),
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({message: "Report scheduled and emailed successfully"});
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({error: "Failed to send email"});
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));
