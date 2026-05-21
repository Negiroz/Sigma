import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';


dotenv.config();
console.log("Current DATABASE_URL is:", process.env.DATABASE_URL);

const app = express();
const port = process.env.PORT || 3001;



// Path to the compiled React frontend
const distPath = path.join(__dirname, '../../client/dist');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

// --- API routes first ---
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// --- Serve static React build ---
app.use(express.static(distPath));

// SPA fallback: for any non-API route, return index.html
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Frontend served from: ${distPath}`);
});
