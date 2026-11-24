// Zhixue AI V1.2 API: PostgreSQL-backed accounts, learning data and OpenAI gateway.
// Secrets must be configured in the hosting provider's environment/secret manager.
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
app.disable('x-powered-by');
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
app.use(cors({ origin(origin, cb) {
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
  return cb(new Error('Origin not allowed'));
} }));
app.use(express.json({ limit: '64kb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: Number(process.env.RATE_LIMIT_PER_MINUTE || 30), standardHeaders: 'draft-8', legacyHeaders: false }));

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000 });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const grades = ['小学一年级','小学二年级','小学三年级','小学四年级','小学五年级','小学六年级','初中一年级','初中二年级','初中三年级','高中一年级','高中二年级','高中三年级'];
const subjects = ['数学','语文','英语','物理','化学','生物','历史','地理','综合'];
const SYSTEM_PROMPT = `你是“小蜜 AI”，面向小学、初中和高中学生的耐心、严谨、鼓励思考的学科辅导老师。教学目标不是替学生完成作业，而是帮助学生真正理解、形成可迁移的解题能力。\n\n【适龄表达】严格根据学生年级调整词汇、例子、步骤数量和抽象程度。小学生用短句和具体例子；初高中生可使用学科术语但必须解释。发现错误时温和指出原因。\n\n【教学结构】先判断知识点；知识重点：解释概念、规律、公式及适用条件；解题思路：说明已知条件和方法选择；分步讲解：逐步推理，计算题展示关键计算和单位；检查与易错点：核对答案并指出误区；实际应用：给出适龄生活应用；举一反三：给一道同类练习，先不直接给答案。\n\n【学科准确性】数学注明单位、符号和适用条件；语文区分文本证据与个人解读；英语解释语境和语法；理化说明量纲、条件和实验安全；生物历史地理不编造事实。若不确定或有教材版本差异，明确说明。\n\n【安全与隐私】不索取真实姓名、住址、学校班级、电话、身份证件或密码。对高风险话题优先提供适龄安全建议并鼓励联系可信任成年人。不协助作弊。请用简体中文回答，除非学生要求其他语言。`;

function configuredAI() { return Boolean(process.env.AI_API_KEY && process.env.AI_MODEL); }
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: '请先登录。' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: '登录状态已失效，请重新登录。' }); }
}
function safeUser(row) { return { id: row.id, email: row.email, nickname: row.nickname, grade: row.grade, createdAt: row.created_at }; }
function asyncRoute(fn) { return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); }

app.get('/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, service: 'zhixue-ai-v1.2', database: 'connected', aiConfigured: configuredAI() });
}));

app.post('/api/auth/register', rateLimit({ windowMs: 15 * 60_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false }), asyncRoute(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const nickname = String(req.body?.nickname || '同学').trim().slice(0, 24) || '同学';
  const grade = grades.includes(req.body?.grade) ? req.body.grade : '初中一年级';
  if (!emailPattern.test(email) || email.length > 254) return res.status(400).json({ error: '请输入有效邮箱。' });
  if (password.length < 10 || password.length > 72) return res.status(400).json({ error: '密码长度须为 10 至 72 个字符。' });
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return res.status(400).json({ error: '密码需同时包含字母和数字。' });
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query('INSERT INTO users(email,password_hash,nickname,grade) VALUES($1,$2,$3,$4) RETURNING id,email,nickname,grade,created_at', [email, hash, nickname, grade]);
    const token = jwt.sign({ sub: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d', issuer: 'zhixue-ai' });
    res.status(201).json({ token, user: safeUser(rows[0]) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: '该邮箱已注册，请直接登录。' });
    throw e;
  }
}));

app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }), asyncRoute(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const { rows } = await pool.query('SELECT id,email,password_hash,nickname,grade,created_at FROM users WHERE email=$1', [email]);
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) return res.status(401).json({ error: '邮箱或密码不正确。' });
  const token = jwt.sign({ sub: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d', issuer: 'zhixue-ai' });
  res.json({ token, user: safeUser(rows[0]) });
}));

app.get('/api/me', auth, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT id,email,nickname,grade,created_at FROM users WHERE id=$1', [req.user.sub]);
  if (!rows.length) return res.status(404).json({ error: '账号不存在。' });
  res.json({ user: safeUser(rows[0]) });
}));
app.patch('/api/me', auth, asyncRoute(async (req, res) => {
  const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim().slice(0,24) : null;
  const grade = grades.includes(req.body?.grade) ? req.body.grade : null;
  if (nickname === null && grade === null) return res.status(400).json({ error: '没有可更新的资料。' });
  const { rows } = await pool.query('UPDATE users SET nickname=COALESCE($1,nickname), grade=COALESCE($2,grade), updated_at=NOW() WHERE id=$3 RETURNING id,email,nickname,grade,created_at', [nickname, grade, req.user.sub]);
  res.json({ user: safeUser(rows[0]) });
}));

app.get('/api/history', auth, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT id,subject,question,answer,created_at FROM learning_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [req.user.sub]);
  res.json({ items: rows });
}));
app.post('/api/history', auth, asyncRoute(async (req, res) => {
  const subject = subjects.includes(req.body?.subject) ? req.body.subject : '综合';
  const question = String(req.body?.question || '').trim().slice(0,4000);
  const answer = String(req.body?.answer || '').trim().slice(0,12000);
  if (!question || !answer) return res.status(400).json({ error: '学习问题和回答不能为空。' });
  const { rows } = await pool.query('INSERT INTO learning_history(user_id,subject,question,answer) VALUES($1,$2,$3,$4) RETURNING id,subject,question,answer,created_at', [req.user.sub, subject, question, answer]);
  res.status(201).json({ item: rows[0] });
}));
app.delete('/api/history/:id', auth, asyncRoute(async (req, res) => {
  await pool.query('DELETE FROM learning_history WHERE id=$1 AND user_id=$2', [req.params.id, req.user.sub]);
  res.status(204).end();
}));

app.get('/api/favorites', auth, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT id,subject,title,content,created_at FROM favorites WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200', [req.user.sub]);
  res.json({ items: rows });
}));
app.post('/api/favorites', auth, asyncRoute(async (req, res) => {
  const subject = subjects.includes(req.body?.subject) ? req.body.subject : '综合';
  const title = String(req.body?.title || '学习收藏').trim().slice(0,120);
  const content = String(req.body?.content || '').trim().slice(0,12000);
  if (!content) return res.status(400).json({ error: '收藏内容不能为空。' });
  const { rows } = await pool.query('INSERT INTO favorites(user_id,subject,title,content) VALUES($1,$2,$3,$4) RETURNING id,subject,title,content,created_at', [req.user.sub, subject, title, content]);
  res.status(201).json({ item: rows[0] });
}));
app.delete('/api/favorites/:id', auth, asyncRoute(async (req, res) => {
  await pool.query('DELETE FROM favorites WHERE id=$1 AND user_id=$2', [req.params.id, req.user.sub]);
  res.status(204).end();
}));

app.post('/api/chat', asyncRoute(async (req, res) => {
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  const subject = subjects.includes(req.body?.subject) ? req.body.subject : '综合';
  const grade = grades.includes(req.body?.grade) ? req.body.grade : '未设置';
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  if (!question) return res.status(400).json({ error: '请先输入问题。' });
  if (question.length > 4000) return res.status(413).json({ error: '问题太长，请控制在 4000 字以内。' });
  if (!configuredAI()) return res.status(503).json({ error: 'AI 服务尚未配置，请管理员检查服务端环境变量。' });
  const safeHistory = history.filter(m => m && ['user','assistant'].includes(m.role) && typeof m.content === 'string').slice(-8).map(m => ({ role: m.role, content: m.content.slice(0,4000) }));
  const messages = [{ role: 'system', content: SYSTEM_PROMPT + `\n本轮学生信息：学科=${subject}；年级=${grade}。` }, ...safeHistory, { role: 'user', content: question }];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS || 60000));
  try {
    const base = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const upstream = await fetch(base + '/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.AI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.AI_MODEL, messages, stream: false }), signal: controller.signal });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) { console.error('OpenAI upstream HTTP', upstream.status); return res.status(502).json({ error: 'AI 老师暂时无法回答，请稍后重试。' }); }
    const answer = data.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) return res.status(502).json({ error: 'AI 服务返回内容为空，请稍后重试。' });
    res.json({ answer: answer.trim(), model: process.env.AI_MODEL });
  } catch (e) {
    const timeout = e.name === 'AbortError';
    console.error('AI request failed:', e.name || 'Error');
    res.status(timeout ? 504 : 502).json({ error: timeout ? 'AI 响应超时，请稍后重试。' : '连接 AI 服务失败，请检查网络和服务配置。' });
  } finally { clearTimeout(timer); }
}));

app.use((err, _req, res, _next) => {
  console.error('Request failed:', err.message || 'unknown error');
  if (res.headersSent) return;
  res.status(500).json({ error: '服务器暂时遇到问题，请稍后重试。' });
});

const required = ['DATABASE_URL','JWT_SECRET'];
if (require.main === module) {
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) { console.error('Missing required environment variables:', missing.join(', ')); process.exit(1); }
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`Zhixue AI V1.2 backend listening on ${port}`));
}
module.exports = app;
