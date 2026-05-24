import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('[startup] imports loaded');

dotenv.config();
console.log('[startup] dotenv loaded');
console.log('[startup] NODE_ENV:', process.env.NODE_ENV);
console.log('[startup] PORT env var:', process.env.PORT);
console.log('[startup] CLIENT_ID_42 present:', !!process.env.CLIENT_ID_42);
console.log('[startup] CLIENT_SECRET_42 present:', !!process.env.CLIENT_SECRET_42);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('[startup] __dirname:', __dirname);

const app = express();
console.log('[startup] express app created');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
console.log('[startup] middleware registered, serving static from:', path.join(__dirname, 'public'));

app.get('/', (req, res) => {
    console.log('[route] GET / — serving index.html');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const CLIENT_ID = process.env.CLIENT_ID_42;
const CLIENT_SECRET = process.env.CLIENT_SECRET_42;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.warn('[config] WARNING: CLIENT_ID_42 or CLIENT_SECRET_42 is missing — token fetch will fail');
}

let accessToken = null;
let tokenExpiry = 0;

async function fetchNewToken() {
    console.log('[token] fetching new 42 token...');
    console.log('[token] using CLIENT_ID:', CLIENT_ID ? CLIENT_ID.slice(0, 8) + '...' : 'MISSING');

    let response;
    try {
        response = await fetch('https://api.intra.42.fr/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET
            })
        });
    } catch (err) {
        console.error('[token] network error reaching 42 oauth:', err.message);
        throw err;
    }

    console.log('[token] 42 oauth response status:', response.status);
    const data = await response.json();

    if (data.access_token) {
        accessToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
        console.log('[token] token obtained, expires_in:', data.expires_in, 's');
        return accessToken;
    }

    console.error('[token] failed to get token, response body:', JSON.stringify(data));
    throw new Error('Impossible d\'obtenir le token');
}

async function getToken() {
    if (!accessToken || Date.now() >= tokenExpiry) {
        console.log('[token] token missing or expired, refreshing...');
        return await fetchNewToken();
    }
    console.log('[token] using cached token, expires in', Math.round((tokenExpiry - Date.now()) / 1000), 's');
    return accessToken;
}

app.get('/api/logtime/:login', async (req, res) => {
    const { login } = req.params;
    console.log('[route] GET /api/logtime/' + login);

    try {
        const token = await getToken();
        console.log('[route] token ready, calling 42 API for:', login);

        const response = await fetch(
            `https://api.intra.42.fr/v2/users/${login}/locations_stats`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        console.log('[route] 42 API response status:', response.status, 'for login:', login);

        if (!response.ok) {
            if (response.status === 404) {
                console.warn('[route] user not found:', login);
                return res.status(404).json({ error: 'Utilisateur non trouvé' });
            }
            throw new Error(`API 42 error: ${response.status}`);
        }

        const data = await response.json();
        console.log('[route] data received for', login, '— keys:', Object.keys(data).length);
        res.json(data);

    } catch (error) {
        console.error('[route] error handling /api/logtime/' + login + ':', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    console.log('[route] GET /api/health');
    res.json({ status: 'ok', message: 'ft_Clock API is running!' });
});

const PORT = process.env.PORT || 2441;
console.log('[startup] binding to port', PORT);

app.listen(PORT, '0.0.0.0', () => {
    console.log('[startup] server listening on http://0.0.0.0:' + PORT);
    console.log('[startup] ready to handle requests');
});