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

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));
app.use(express.json());

app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/chat', chatRouter);
app.use('/team', teamRouter);
app.use('/telegram', telegramRouter);
app.use('/emails', emailsRouter);
app.use('/calendar', calendarRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`AIOS Backend running on http://localhost:${PORT}`);
});
