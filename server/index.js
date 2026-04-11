import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// simple in-memory users store (for dev/testing only)
const users = [];

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Mock backend running' });
});

app.post('/register', (req, res) => {
  const { displayName, email, password } = req.body || {};
  if (!displayName || !email || !password) {
    return res.json({ ok: false, message: 'Vui lòng điền đầy đủ thông tin.' });
  }

  const exists = users.find((u) => u.email === email.toLowerCase());
  if (exists) return res.json({ ok: false, message: 'Email da duoc su dung' });

  const newUser = { id: users.length + 1, displayName, email: email.toLowerCase(), password };
  users.push(newUser);

  return res.json({ ok: true, session: { id: newUser.id, displayName: newUser.displayName, email: newUser.email } });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = users.find((u) => u.email === (email || '').toLowerCase());
  if (!user || user.password !== password) {
    return res.json({ ok: false, message: 'Email hoac mat khau sai' });
  }
  return res.json({ ok: true, session: { id: user.id, displayName: user.displayName, email: user.email } });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Mock backend listening on http://localhost:${port}`);
});
