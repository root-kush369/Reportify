import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import PivotTableUI from 'react-pivottable';
import 'react-pivottable/pivottable.css';
import 'react-datepicker/dist/react-datepicker.css';
import './App.css';

// Get API base from environment
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:10000';

function App() {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
    userId: '',
    region: ''
  });
  const [pivotState, setPivotState] = useState({});
  const [scheduleConfig, setScheduleConfig] = useState({
    email: '',
    frequency: '0 9 * * *' // Daily at 9AM
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [regions, setRegions] = useState([]);
  const [users, setUsers] = useState([]);

  // Initialize application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const [regionsRes, usersRes] = await Promise.all([
          axios.get(`${API_BASE}/api/regions`),
          axios.get(`${API_BASE}/api/users`)
        ]);
        
        setRegions(regionsRes.data);
        setUsers(usersRes.data);
        fetchData();
      } catch (err) {
        setError('Failed to initialize application');
        console.error('Initialization error:', err);
      }
    };
    
    initializeApp();
  }, []);

  // Fetch data with current filters
  const fetchData = async () => {
    setError('');
    setLoading(true);
    
    try {
      const res = await axios.post(`${API_BASE}/api/data`, {
        startDate: filters.startDate.toISOString().split('T')[0],
        endDate: filters.endDate.toISOString().split('T')[0],
        userId: filters.userId,
        region: filters.region
      });
      
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const exportExcel = async () => {
    if (data.length === 0) {
      setError('No data to export');
      return;
    }
    
    try {
      const res = await axios.post(
        `${API_BASE}/api/export/excel`,
        { data },
        { responseType: 'blob' }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'insight360_report.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export Excel. Please try again.');
    }
  };

  // Export to PDF
  const exportPDF = async () => {
    if (data.length === 0) {
      setError('No data to export');
      return;
    }
    
    try {
      const res = await axios.post(
        `${API_BASE}/api/export/pdf`,
        { data },
        { responseType: 'blob' }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'insight360_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export PDF. Please try again.');
    }
  };

  // Schedule report
  const scheduleReport = async () => {
    if (!scheduleConfig.email) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(scheduleConfig.email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    try {
      const response = await axios.post(`${API_BASE}/api/schedule`, {
        email: scheduleConfig.email,
        frequency: scheduleConfig.frequency,
        reportConfig: { filters }
      });
      
      setSuccess(`Report scheduled successfully! Next run: ${new Date(response.data.nextRun).toLocaleString()}`);
      setError('');
      setTimeout(() => setSuccess(''), 10000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to schedule report');
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Insight360 Analytics Platform</h1>
        <p>Enterprise Reporting & Business Intelligence</p>
      </header>

      <main className="app-content">
        <section className="filters-section card">
          <div className="section-header">
            <h2>Data Filters</h2>
            <button 
              onClick={fetchData} 
              className="primary-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="loading-indicator">Loading Data...</span>
              ) : (
                'Apply Filters'
              )}
            </button>
          </div>
          
          <div className="filter-grid">
            <div className="filter-group">
              <label>Start Date</label>
              <DatePicker 
                selected={filters.startDate} 
                onChange={date => setFilters({...filters, startDate: date})}
                dateFormat="MMM d, yyyy"
                className="filter-input"
                maxDate={new Date()}
              />
            </div>
            
            <div className="filter-group">
              <label>End Date</label>
              <DatePicker 
                selected={filters.endDate} 
                onChange={date => setFilters({...filters, endDate: date})}
                dateFormat="MMM d, yyyy"
                className="filter-input"
                maxDate={new Date()}
              />
            </div>
            
            <div className="filter-group">
              <label>User</label>
              <select
                value={filters.userId}
                onChange={e => setFilters({...filters, userId: e.target.value})}
                className="filter-input"
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Region</label>
              <select
                value={filters.region}
                onChange={e => setFilters({...filters, region: e.target.value})}
                className="filter-input"
              >
                <option value="">All Regions</option>
                {regions.map(region => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="data-section card">
          <div className="section-header">
            <h2>Analytics Dashboard</h2>
            <div className="export-actions">
              <button 
                onClick={exportExcel} 
                className="export-btn excel"
                disabled={data.length === 0 || loading}
              >
                Export Excel
              </button>
              <button 
                onClick={exportPDF} 
                className="export-btn pdf"
                disabled={data.length === 0 || loading}
              >
                Export PDF
              </button>
            </div>
          </div>
          
          {data.length > 0 ? (
            <div className="pivot-table-container">
              <PivotTableUI
                data={data}
                onChange={s => setPivotState(s)}
                {...pivotState}
                rendererName="Table"
              />
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No Data Available</h3>
              <p>Apply filters to load your analytics data</p>
            </div>
          )}
        </section>

        <section className="scheduling-section card">
          <h2>Automated Report Scheduling</h2>
          
          <div className="schedule-form">
            <div className="form-group">
              <label>Recipient Email</label>
              <input 
                type="email" 
                placeholder="your.email@company.com" 
                value={scheduleConfig.email}
                onChange={e => setScheduleConfig({...scheduleConfig, email: e.target.value})}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label>Schedule Frequency</label>
              <div className="frequency-options">
                <button 
                  type="button"
                  className={`freq-option ${scheduleConfig.frequency === '0 9 * * *' ? 'active' : ''}`}
                  onClick={() => setScheduleConfig({...scheduleConfig, frequency: '0 9 * * *'})}
                >
                  Daily
                </button>
                <button 
                  type="button"
                  className={`freq-option ${scheduleConfig.frequency === '0 9 * * 1' ? 'active' : ''}`}
                  onClick={() => setScheduleConfig({...scheduleConfig, frequency: '0 9 * * 1'})}
                >
                  Weekly
                </button>
                <button 
                  type="button"
                  className={`freq-option ${scheduleConfig.frequency === '0 9 1 * *' ? 'active' : ''}`}
                  onClick={() => setScheduleConfig({...scheduleConfig, frequency: '0 9 1 * *'})}
                >
                  Monthly
                </button>
              </div>
              
              <div className="hint">
                Selected: {scheduleConfig.frequency === '0 9 * * *' ? 'Daily at 9:00 AM' : 
                          scheduleConfig.frequency === '0 9 * * 1' ? 'Weekly on Monday at 9:00 AM' : 
                          'Monthly on the 1st at 9:00 AM'}
              </div>
            </div>
            
            <button 
              onClick={scheduleReport} 
              className="primary-btn schedule-btn"
            >
              Schedule Report
            </button>
          </div>
        </section>
      </main>

      {error && (
        <div className="status-message error">
          <span>{error}</span>
          <button onClick={() => setError('')} className="close-btn">×</button>
        </div>
      )}
      
      {success && (
        <div className="status-message success">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="close-btn">×</button>
        </div>
      )}

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-logo">Insight360</div>
          <div className="footer-links">
            <a href="#">Documentation</a>
            <a href="#">Support</a>
            <a href="#">Privacy Policy</a>
          </div>
          <div className="footer-copyright">
            © {new Date().getFullYear()} Insight360 Analytics. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;