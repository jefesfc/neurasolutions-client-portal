import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import chatRouter from './routes/chat';
import teamRouter from './routes/team';
import telegramRouter from './routes/telegram';
import emailsRouter from './routes/emails';
import calendarRouter from './routes/calendar';
import { securityMonitor } from './middleware/securityMonitor';
import securityRouter from './routes/security';
import notificationsRouter from './routes/notifications';
import clientsRouter from './routes/clients';
import invoicingRouter from './routes/invoicing';
import billingRouter from './routes/billing';
import supportRouter from './routes/support';
import reportsRouter from './routes/reports';
import postgrestProxyRouter from './routes/postgrestProxy';
import knowledgeRouter from './routes/knowledge';
import stripeRouter from './routes/stripe';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

const allowedOrigins = [
  'https://ios.neurasolutions.cloud',
  process.env.FRONTEND_URL ?? 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
];
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)) }));

// Stripe webhook needs raw body for signature verification — applied BEFORE express.json()
app.use('/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(securityMonitor);

app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/chat', chatRouter);
app.use('/team', teamRouter);
app.use('/telegram', telegramRouter);
app.use('/emails', emailsRouter);
app.use('/calendar', calendarRouter);
app.use('/security', securityRouter);
app.use('/notifications', notificationsRouter);
app.use('/clients', clientsRouter);
app.use('/invoicing', invoicingRouter);
app.use('/billing', billingRouter);
app.use('/support', supportRouter);
app.use('/reports', reportsRouter);

app.use('/knowledge', knowledgeRouter);
app.use('/stripe', stripeRouter);
app.use('/pg', postgrestProxyRouter);
app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`AIOS Backend running on http://localhost:${PORT}`);
});
