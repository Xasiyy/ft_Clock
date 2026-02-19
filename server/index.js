import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.CLIENT_ID_42;
const CLIENT_SECRET = process.env.CLIENT_SECRET_42;

let accessToken = null;
let tokenExpiry = 0;

// Obtenir un token 42
async function fetchNewToken() {
    console.log('🔑 Obtention d\'un nouveau token 42...');
    
    const response = await fetch('https://api.intra.42.fr/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        })
    });

    const data = await response.json();
    
    if (data.access_token) {
        accessToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // -1 min de marge
        console.log('✅ Token obtenu !');
        return accessToken;
    }
    
    throw new Error('Impossible d\'obtenir le token');
}

async function getToken()
{
    if (!accessToken || Date.now() >= tokenExpiry)
    {
        return await fetchNewToken();
    }
    return accessToken;
}

async function callApi42(url)
{
    let token = await getToken();

    let response = await fetch(url, {headers: {'Autorization': `Baerer ${token}`}});

    if (response.status === 401)
    {
        console.log(`⚠️ Token invalide, renouvellement...`);
        accessToken = null;
        token = await fetchNewToken();

        response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }});
    }
    return response;
}

app.get('/api/logtime/:login', async (req, res) => {
    const { login } = req.params;
    
    try {
        const token = await getToken();
        
        const response = await callApi42(
            `https://api.intra.42.fr/v2/users/${login}/locations_stats`,
            {
                headers: { 'Authorization': `Baerer ${token}` }
            }
        );

        if (!response.ok) {
            if (response.status === 404) {
                return res.status(404).json({ error: 'Utilisateur non trouvé' });
            }
            throw new Error(`API 42 error: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route de test
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'ft_Clock API is running!' });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur ft_Clock lancé sur http://localhost:${PORT}`);
});