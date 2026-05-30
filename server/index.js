import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

const LK_API_KEY = process.env.LK_API_KEY ?? process.env.LIVEKIT_API_KEY;
const LK_API_SECRET = process.env.LK_API_SECRET ?? process.env.LIVEKIT_API_SECRET;
const PORT = process.env.PORT ?? 3001;

app.get('/health', (_, res) => res.json({ ok: true }));

app.get('/token', async (req, res) => {
  const { room, username } = req.query;
  if (!room || !username)
    return res.status(400).json({ error: 'room and username are required' });
  if (!LK_API_KEY || !LK_API_SECRET)
    return res.status(500).json({ error: 'Server missing LK_API_KEY / LK_API_SECRET' });

  const at = new AccessToken(LK_API_KEY, LK_API_SECRET, {
    identity: `${username}-${Date.now()}`,
    name: String(username),
    ttl: '4h',
  });
  at.addGrant({
    roomJoin: true,
    room: String(room),
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();
  res.json({ token });
});

app.listen(PORT, () =>
  console.log(`\n🚀 Token server running on http://localhost:${PORT}\n`)
);
