// Express.js backend server for separate deployment
// Deploy this to Railway/Render if Vercel function limit is an issue
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import handlers (convert from Vercel format)
import authRoutes from './routes/auth.js';
import authGoogleRoutes from './routes/auth-google.js';
import eventsRoutes from './routes/events.js';
import meetupsRoutes from './routes/meetups.js';
import adminRoutes from './routes/admin.js';
import communitiesRoutes from './routes/communities.js';
import councilRoutes from './routes/council.js';
import achievementsRoutes from './routes/achievements.js';
import uploadRoutes from './routes/upload.js';
import logsRoutes from './routes/logs.js';
import linksRoutes from './routes/links.js';
import contactsRoutes from './routes/contacts.js';
import contributorsRoutes from './routes/contributors.js';
import statsRoutes from './routes/stats.js';
import complaintsRoutes from './routes/complaints.js';
import googleFormsRoutes from './routes/google-forms.js';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Railway/Render put one proxy in front of the app; trust it so req.ip is the real client address
app.set('trust proxy', 1);

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  'https://*.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.some(allowed =>
      origin === allowed ||
      origin.match(new RegExp(allowed.replace('*', '.*')))
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rate limiting: a general cap on all API traffic, and a tighter one on sign-in
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
}));
app.use(['/api/auth/login', '/api/auth/google'], rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts, please try again later' }
}));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', authGoogleRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/meetups', meetupsRoutes);
app.use('/api/communities', communitiesRoutes);
app.use('/api/council', councilRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/contributors', contributorsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/google-forms', googleFormsRoutes);

// Log tracking API
app.use('/api/logs', logsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});


// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Environment check:`, {
    supabaseUrl: process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing',
    jwtSecret: process.env.JWT_SECRET ? '✓ Set' : '✗ Missing'
  });
});

// Debug: show whether Google OAuth client ID is available at runtime
console.log('Google OAuth config:', {
  googleClientId: process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Missing'
});
