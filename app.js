const path = require('path');
const fs = require('fs');
const express = require('express');
const OS = require('os');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();

// CORS setup
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like curl or mobile apps)
        if (!origin) return callback(null, true);

        // Allowed origins for production
        const allowedOrigins = ['http://localhost:3000'];  // Add your real domain here later

        if (process.env.NODE_ENV === 'production') {
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            } else {
                return callback(new Error('Not allowed by CORS'));
            }
        }

        // Allow all origins in development
        return callback(null, true);
    },
    credentials: true,
};

app.use(cors(corsOptions));

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    user: process.env.MONGO_USERNAME,
    pass: process.env.MONGO_PASSWORD,
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connection successful"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// Mongoose schema and model
const Schema = mongoose.Schema;

const dataSchema = new Schema({
    name: String,
    id: Number,
    description: String,
    image: String,
    velocity: String,
    distance: String
});

const planetModel = mongoose.model('planets', dataSchema);

// Routes
app.post('/planet', async function(req, res) {
    try {
        const planetData = await planetModel.findOne({ id: req.body.id });

        if (!planetData) {
            return res.status(404).send("Planet not found");
        }

        res.send(planetData);
    } catch (err) {
        console.error("Error fetching planet data:", err);
        res.status(500).send("Internal server error");
    }
});

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, '/', 'index.html'));
});

app.get('/api-docs', (req, res) => {
    fs.readFile('oas.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            res.status(500).send('Error reading file');
        } else {
            res.json(JSON.parse(data));
        }
    });
});

app.get('/os', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        os: OS.hostname(),
        env: process.env.NODE_ENV
    });
});

app.get('/live', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({ status: "live" });
});

app.get('/ready', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({ status: "ready" });
});

// Start server
app.listen(3000, () => {
    console.log("Server successfully running on port - 3000");
});

module.exports = app;
// module.exports.handler = serverless(app);
