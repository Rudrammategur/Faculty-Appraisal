require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const appraisalRoutes = require("./routes/appraisalRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const workflowRoutes = require('./routes/workflowRoutes');
const fwOfficeRoutes = require('./routes/fwOfficeRoutes');
const appraisalExtraRoutes = require('./routes/appraisalExtraRoutes');
const app = express();

// Middleware
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  credentials: true
}));

app.use(express.json({ limit: "4mb" }));

// Health check
app.get("/api/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Faculty Appraisal Backend is running"
    });
});

// API routes
app.use("/api/appraisal", appraisalRoutes);
app.use('/api/appraisal', appraisalExtraRoutes);
app.use("/api/faculty", facultyRoutes);
app.use('/api/appraisal-workflow', workflowRoutes);
app.use(
  '/api/responsibility-documents',
  require('./routes/responsibilityDocumentRoutes')
);
app.use('/api/fw', fwOfficeRoutes);
app.use(
  '/api/faculty',
  require('./routes/appraisalWindowRoutes')
);

app.use('/api/appraisal-documents', require('./routes/appraisalDocumentRoutes'));

// Handle unknown routes
app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error("Backend Error:", err);

    return res.status(err.statusCode || 500).json({
        success: false,
        message: err.statusCode
            ? err.message
            : "Internal server error"
    });
});

// Start server
const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, () => {
    console.log(`Faculty Appraisal API running on port ${PORT}`);
});