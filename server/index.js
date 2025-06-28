require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const schedule = require('node-schedule');
const nodemailer = require('nodemailer');
const ExcelJS = require('exceljs');
const winston = require('winston');
const chromium = require('chrome-aws-lambda');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

const app = express();

// CORS Configuration
const allowedOrigins = [
  'https://insight360-frontend.vercel.app', // Production frontend
  'http://localhost:5173' // Local development
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Initialize email transporter (Gmail)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'active', 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Get regions
app.get('/api/regions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sales_data')
      .select('region')
      .neq('region', null)
      .order('region', { ascending: true });
    
    if (error) throw error;
    
    const regions = [...new Set(data.map(item => item.region))];
    res.json(regions);
  } catch (error) {
    logger.error('Regions endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

// Get users
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sales_data')
      .select('user_id')
      .neq('user_id', null)
      .order('user_id', { ascending: true });
    
    if (error) throw error;
    
    const users = [...new Set(data.map(item => item.user_id))].map(id => ({ 
      id, 
      name: `User ${id}` 
    }));
    res.json(users);
  } catch (error) {
    logger.error('Users endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Fetch data with filters
app.post('/api/data', async (req, res) => {
  try {
    const { startDate, endDate, userId, region } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }
    
    let query = supabase
      .from('sales_data')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (userId) query = query.eq('user_id', userId);
    if (region) query = query.eq('region', region);

    const { data, error } = await query;
    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    logger.error('Data endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Export to Excel
app.post('/api/export/excel', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'No data to export' });
    }
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');
    
    const headers = Object.keys(data[0]);
    worksheet.columns = headers.map(header => ({
      header: header.toUpperCase(),
      key: header,
      width: 20
    }));
    
    data.forEach(row => worksheet.addRow(row));
    
    // Style header
    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: 'FF007BFF' } 
      };
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=insight360_report.xlsx');
    res.send(buffer);
  } catch (error) {
    logger.error('Excel export error:', error);
    res.status(500).json({ error: 'Failed to generate Excel report' });
  }
});

// Export to PDF
app.post('/api/export/pdf', async (req, res) => {
  let browser = null;
  try {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'No data to export' });
    }
    
    browser = await chromium.puppeteer.launch({
      args: [
        ...chromium.args,
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ],
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    await page.setContent(generatePDFTemplate(data), { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=insight360_report.pdf');
    res.send(pdf);
  } catch (error) {
    logger.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  } finally {
    if (browser) await browser.close();
  }
});

// Schedule reports
app.post('/api/schedule', async (req, res) => {
  try {
    const { email, frequency, reportConfig } = req.body;
    
    if (!email || !frequency || !reportConfig) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    const job = schedule.scheduleJob(frequency, async () => {
      try {
        const { data, error } = await supabase
          .from('sales_data')
          .select('*')
          .match(reportConfig.filters || {});
        
        if (error) throw error;
        
        const browser = await chromium.puppeteer.launch({
          args: [...chromium.args, '--disable-dev-shm-usage'],
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
        });
        
        const page = await browser.newPage();
        await page.setContent(generatePDFTemplate(data));
        const pdfBuffer = await page.pdf();
        await browser.close();
        
        await transporter.sendMail({
          from: `"Insight360 Reports" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Scheduled Report',
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2>Insight360 Analytics Report</h2>
              <p>Your scheduled report is attached as a PDF file.</p>
              <p><strong>Generated at:</strong> ${new Date().toLocaleString()}</p>
              <hr>
              <p>© ${new Date().getFullYear()} Insight360 - Automated Reporting System</p>
            </div>
          `,
          attachments: [{
            filename: `insight360_report_${new Date().toISOString().split('T')[0]}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }]
        });
        
        logger.info(`Sent scheduled report to ${email}`);
      } catch (error) {
        logger.error('Scheduled job failed:', error);
      }
    });
    
    // Store job in database
    const { error: dbError } = await supabase
      .from('scheduled_reports')
      .insert({
        email,
        frequency,
        report_config: reportConfig,
        next_run: job.nextInvocation()
      });
    
    if (dbError) throw dbError;
    
    res.json({ 
      success: true,
      message: 'Report scheduled successfully',
      nextRun: job.nextInvocation().toISOString()
    });
  } catch (error) {
    logger.error('Schedule endpoint error:', error);
    res.status(500).json({ error: 'Failed to schedule report' });
  }
});

// Generate PDF template
function generatePDFTemplate(data) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Insight360 Report</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 25px; color: #333; }
      .header { text-align: center; margin-bottom: 30px; }
      .header h1 { color: #2c3e50; margin: 0 0 10px 0; font-size: 28px; }
      .subtitle { color: #7f8c8d; font-size: 16px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      th { background-color: #3498db; color: white; text-align: left; padding: 12px 15px; font-weight: 600; }
      td { padding: 10px 15px; border-bottom: 1px solid #e0e0e0; }
      tr:nth-child(even) { background-color: #f8f9fa; }
      .footer { margin-top: 40px; text-align: center; color: #7f8c8d; font-size: 14px; padding-top: 20px; border-top: 1px solid #eee; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Insight360 Analytics Report</h1>
      <div class="subtitle">Generated on ${new Date().toLocaleDateString()}</div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>User ID</th>
          <th>Region</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr>
            <td>${new Date(row.date).toLocaleDateString()}</td>
            <td>${row.user_id}</td>
            <td>${row.region}</td>
            <td>$${parseFloat(row.amount).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="footer">
      <p>Confidential Report - © ${new Date().getFullYear()} Insight360 Analytics</p>
      <p>This report was generated automatically. Do not reply to this email.</p>
    </div>
  </body>
  </html>
  `;
}

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`Insight360 Backend Ready: http://localhost:${PORT}`);
});