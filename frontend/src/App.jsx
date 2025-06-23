import {useState, useEffect} from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "./index.css";

function App() {
    const [filters, setFilters] = useState({date: "", category: "", user: "", region: ""});
    const [reports, setReports] = useState([]);
    const [newReport, setNewReport] = useState({date: "", category: "", amount: "", user: "", region: ""});
    const [email, setEmail] = useState("");

    // Fetch reports on mount
    useEffect(() => {
        axios
        .get("http://localhost:5000/api/reports")
        .then((response) => setReports(response.data))
        .catch((error) => console.error("Error fetching reports:", error));
    }, []);

    // Handle filter changes
    const handleFilterChange = (e) => {
        setFilters({...filters, [e.target.name]: e.target.value});
    };

    // Handle new report input
    const handleNewReportChange = (e) => {
        setNewReport({...newReport, [e.target.name]: e.target.value});
    };

    // Add new report
    const addReport = () => {
        axios
        .post("http://localhost:5000/api/reports", {
            date: newReport.date,
            category: newReport.category,
            amount: parseFloat(newReport.amount) || 0,
            user: newReport.user,
            region: newReport.region,
        })
        .then((response) => {
            setReports([...reports, response.data]);
            setNewReport({date: "", category: "", amount: "", user: "", region: ""});
        })
        .catch((error) => console.error("Error adding report:", error));
    };

    // Apply filters to reports
    const filteredReports = reports.filter(
        (report) =>
            (filters.date ? report.date === filters.date : true) &&
            (filters.category ? report.category === filters.category : true) &&
            (filters.user ? report.user.toLowerCase().includes(filters.user.toLowerCase()) : true) &&
            (filters.region ? report.region.toLowerCase().includes(filters.region.toLowerCase()) : true)
    );

    // Export filtered reports to PDF
    const exportPDF = () => {
        if (filteredReports.length === 0) {
            alert("No reports to export. Add or adjust filters to include data.");
            return;
        }
        const doc = new jsPDF();
        doc.text("Reportify Report", 10, 10);
        filteredReports.forEach((report, index) => {
            doc.text(
                `${report.id}. ${report.date} | ${report.category} | $${report.amount} | ${report.user} | ${report.region}`,
                10,
                20 + index * 10
            );
        });
        doc.save("reportify-report.pdf");
    };

    // Schedule report via email
    const scheduleReport = () => {
        if (!email) {
            alert("Please enter an email address");
            return;
        }
        if (filteredReports.length === 0) {
            alert("No reports to schedule. Add or adjust filters to include data.");
            return;
        }
        axios
        .post("http://localhost:5000/api/schedule-report", {email, reportData: filteredReports})
        .then((response) => alert(response.data.message))
        .catch((error) => {
            console.error("Error scheduling report:", error);
            alert("Failed to schedule report");
        });
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-5xl">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Reportify - Reporting Engine</h1>

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
                    <button onClick={exportPDF} className="bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700">
                        Export to PDF
                    </button>
                </div>

                {/* Email Scheduling */}
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
                        className="bg-green-600 text-white p-3 rounded-md hover:bg-green-700"
                    >
                        Schedule Report
                    </button>
                </div>

                {/* Data Entry Form */}
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
                            className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 col-span-full sm:col-span-1"
                        >
                            Add Report
                        </button>
                    </div>
                </div>

                {/* Pivot-like Table */}
                <div className="overflow-x-auto">
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
                                        <td className="border-b border-gray-200 p-4">${report.amount.toFixed(2)}</td>
                                        <td className="border-b border-gray-200 p-4">{report.user}</td>
                                        <td className="border-b border-gray-200 p-4">{report.region}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-4 text-center text-gray-500">
                                        No reports match the current filters or database is empty. Add a report to
                                        start.
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
