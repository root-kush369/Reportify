import { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "./index.css";

function App() {
  const [filters, setFilters] = useState({ date: "", category: "", user: "", region: "" });
  const [reports, setReports] = useState([]);
  const [newReport, setNewReport] = useState({ date: "", category: "", amount: "", user: "", region: "" });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fixed API base URL handling - remove trailing slash if present
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      console.log("Fetching from:", `${API_BASE_URL}/api/reports`);
      const response = await axios.get(`${API_BASE_URL}/api/reports`);
      setReports(response.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
      setError("Failed to fetch reports. Please check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleNewReportChange = (e) => {
    setNewReport({ ...newReport, [e.target.name]: e.target.value });
  };

  const addReport = async () => {
    if (!newReport.date || !newReport.category || !newReport.amount || !newReport.user || !newReport.region) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/reports`, {
        date: newReport.date,
        category: newReport.category,
        amount: parseFloat(newReport.amount) || 0,
        user: newReport.user,
        region: newReport.region,
      });
      
      setReports([...reports, response.data]);
      setNewReport({ date: "", category: "", amount: "", user: "", region: "" });
      alert("Report added successfully!");
    } catch (error) {
      console.error("Error adding report:", error);
      alert("Failed to add report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(
    (report) =>
      (filters.date ? report.date === filters.date : true) &&
      (filters.category ? report.category === filters.category : true) &&
      (filters.user ? report.user.toLowerCase().includes(filters.user.toLowerCase()) : true) &&
      (filters.region ? report.region.toLowerCase().includes(filters.region.toLowerCase()) : true)
  );

  const exportPDF = () => {
    if (filteredReports.length === 0) {
      alert("No reports to export. Add or adjust filters to include data.");
      return;
    }
    
    try {
      const doc = new jsPDF();
      doc.text("Reportify Report", 10, 10);
      
      filteredReports.forEach((report, index) => {
        const yPosition = 20 + index * 10;
        if (yPosition > 280) { // Add new page if needed
          doc.addPage();
        }
        doc.text(
          `${report.id}. ${report.date} | ${report.category} | $${report.amount.toFixed(2)} | ${report.user} | ${report.region}`,
          10,
          yPosition > 280 ? 20 : yPosition
        );
      });
      
      doc.save("reportify-report.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF");
    }
  };

  const scheduleReport = async () => {
    if (!email) {
      alert("Please enter an email address");
      return;
    }
    if (filteredReports.length === 0) {
      alert("No reports to schedule. Add or adjust filters to include data.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/schedule-report`, { 
        email, 
        reportData: filteredReports 
      });
      alert(response.data.message);
    } catch (error) {
      console.error("Error scheduling report:", error);
      alert("Failed to schedule report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Reportify - Reporting Engine</h1>
        
        {/* Connection Status */}
        <div className="mb-4 text-center">
          <span className={`px-3 py-1 rounded-full text-sm ${
            error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {error ? 'Backend Connection Error' : 'Connected to Backend'}
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button 
              onClick={fetchReports}
              className="ml-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <input
            type="date"
            name="date"
            value={filters.date}
            onChange={handleFilterChange}
            className="border border-gray-300 rounded-md p-3"
          />
          <select
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            className="border border-gray-300 rounded-md p-3"
          >
            <option value="">All Categories</option>
            <option value="Sales">Sales</option>
            <option value="HR">HR</option>
            <option value="Finance">Finance</option>
          </select>
          <input
            type="text"
            name="user"
            placeholder="Filter by user"
            value={filters.user}
            onChange={handleFilterChange}
            className="border border-gray-300 rounded-md p-3"
          />
          <input
            type="text"
            name="region"
            placeholder="Filter by region"
            value={filters.region}
            onChange={handleFilterChange}
            className="border border-gray-300 rounded-md p-3"
          />
          <button 
            onClick={exportPDF} 
            disabled={loading}
            className="bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Export to PDF
          </button>
        </div>

        {/* Email Schedule */}
        <div className="mb-6 flex gap-4">
          <input
            type="email"
            placeholder="Email for scheduled report"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-300 rounded-md p-3 flex-1"
          />
          <button 
            onClick={scheduleReport} 
            disabled={loading}
            className="bg-green-600 text-white p-3 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Schedule Report
          </button>
        </div>

        {/* Add New Report */}
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h2 className="text-xl font-semibold mb-4">Add New Report</h2>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <input
              type="date"
              name="date"
              value={newReport.date}
              onChange={handleNewReportChange}
              className="border border-gray-300 rounded-md p-2"
              placeholder="Date"
            />
            <select
              name="category"
              value={newReport.category}
              onChange={handleNewReportChange}
              className="border border-gray-300 rounded-md p-2"
            >
              <option value="">Select Category</option>
              <option value="Sales">Sales</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
            </select>
            <input
              type="number"
              name="amount"
              value={newReport.amount}
              onChange={handleNewReportChange}
              className="border border-gray-300 rounded-md p-2"
              placeholder="Amount"
              step="0.01"
            />
            <input
              type="text"
              name="user"
              value={newReport.user}
              onChange={handleNewReportChange}
              className="border border-gray-300 rounded-md p-2"
              placeholder="User"
            />
            <input
              type="text"
              name="region"
              value={newReport.region}
              onChange={handleNewReportChange}
              className="border border-gray-300 rounded-md p-2"
              placeholder="Region"
            />
            <button
              onClick={addReport}
              disabled={loading}
              className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 col-span-full sm:col-span-1"
            >
              {loading ? "Adding..." : "Add Report"}
            </button>
          </div>
        </div>

        {/* Reports Table */}
        <div className="overflow-x-auto">
          {loading && <div className="text-center py-4">Loading...</div>}
          
          <table className="w-full border-collapse bg-white rounded-md shadow-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="border-b border-gray-200 p-4 text-left">ID</th>
                <th className="border-b border-gray-200 p-4 text-left">Date</th>
                <th className="border-b border-gray-200 p-4 text-left">Category</th>
                <th className="border-b border-gray-200 p-4 text-left">Amount</th>
                <th className="border-b border-gray-200 p-4 text-left">User</th>
                <th className="border-b border-gray-200 p-4 text-left">Region</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report, index) => (
                  <tr key={report.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="border-b border-gray-200 p-4">{report.id}</td>
                    <td className="border-b border-gray-200 p-4">{report.date}</td>
                    <td className="border-b border-gray-200 p-4">{report.category}</td>
                    <td className="border-b border-gray-200 p-4">${Number(report.amount).toFixed(2)}</td>
                    <td className="border-b border-gray-200 p-4">{report.user}</td>
                    <td className="border-b border-gray-200 p-4">{report.region}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">
                    {loading ? "Loading reports..." : "No reports match the current filters or database is empty. Add a report to start."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;