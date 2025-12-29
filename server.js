const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(__dirname));
app.use(express.json());

// Path to data file
const DATA_FILE = path.join(__dirname, 'votes.json');

// Initialize data file if it doesn't exist
function initializeDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = {
            votes: [],
            votedIPs: [],
            adminPassword: 'slay2026admin' // Default password, can be changed
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    } else {
        // Ensure votedIPs array exists in existing data
        const data = readData();
        if (!data.votedIPs) {
            data.votedIPs = [];
            writeData(data);
        }
    }
}

// Read data from file
function readData() {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
}

// Write data to file
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Get client IP address
function getClientIp(req) {
    return req.headers['x-forwarded-for'] ||  // For proxies
           req.connection.remoteAddress ||    // Direct connection
           req.socket.remoteAddress ||        // Alternative
           req.connection.socket.remoteAddress;
}

// API Endpoints
app.post('/api/vote', (req, res) => {
    try {
        const { voter_id, votes } = req.body;
        const clientIp = getClientIp(req);

        if (!voter_id || !votes) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const data = readData();

        // Check if this voter already voted
        const existingVoteIndex = data.votes.findIndex(v => v.voter_id === voter_id);
        if (existingVoteIndex !== -1) {
            // Update existing vote (allow updating without IP restriction)
            data.votes[existingVoteIndex] = {
                voter_id,
                votes,
                created_at: new Date().toISOString(),
                ip: clientIp
            };

            writeData(data);

            return res.json({
                success: true,
                message: 'Vote updated successfully'
            });
        }

        // Check if this IP has already voted (only for new votes)
        const hasVotedByIp = data.votedIPs.includes(clientIp);
        if (hasVotedByIp) {
            return res.status(403).json({
                success: false,
                error: 'Вы уже голосовали с этого устройства'
            });
        }

        // Add new vote
        data.votes.push({
            voter_id,
            votes,
            created_at: new Date().toISOString(),
            ip: clientIp
        });
        // Add IP to voted list
        data.votedIPs.push(clientIp);

        writeData(data);

        res.json({
            success: true,
            message: 'Vote recorded successfully'
        });
    } catch (error) {
        console.error('Error saving vote:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/clear-votes', (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Missing password' });
        }

        const data = readData();
        if (password !== data.adminPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Clear all votes and voted IPs
        data.votes = [];
        data.votedIPs = [];

        writeData(data);

        res.json({
            success: true,
            message: 'All votes and IP restrictions cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing votes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/vote/:voterId', (req, res) => {
    try {
        const { voterId } = req.params;

        if (!voterId) {
            return res.status(400).json({ error: 'Missing voter_id' });
        }

        const data = readData();
        const userVote = data.votes.find(v => v.voter_id === voterId);

        if (!userVote) {
            return res.status(404).json({ error: 'Vote not found' });
        }

        res.json({
            success: true,
            vote: userVote
        });
    } catch (error) {
        console.error('Error getting vote:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/votes', (req, res) => {
    try {
        const data = readData();
        res.json({
            success: true,
            votes: data.votes
        });
    } catch (error) {
        console.error('Error reading votes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/check-voted', (req, res) => {
    try {
        const { voter_id } = req.body;

        if (!voter_id) {
            return res.status(400).json({ error: 'Missing voter_id' });
        }

        const data = readData();
        const hasVoted = data.votes.some(v => v.voter_id === voter_id);

        res.json({
            success: true,
            hasVoted
        });
    } catch (error) {
        console.error('Error checking vote status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/check-password', (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Missing password' });
        }

        const data = readData();
        const isValid = password === data.adminPassword;

        res.json({
            success: true,
            isValid
        });
    } catch (error) {
        console.error('Error checking admin password:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize data file
initializeDataFile();

// Keep-alive endpoint for Render
app.get('/keep-alive', (req, res) => {
    res.json({
        success: true,
        message: 'Server is alive',
        timestamp: new Date().toISOString()
    });
});

// Simple ping endpoint
app.get('/ping', (req, res) => {
    res.send('pong');
});

app.listen(PORT, () => {
    console.log(`🚀 Slay Sving server running on port ${PORT}`);
    console.log(`📊 Data file: ${DATA_FILE}`);
    console.log(`🔄 Keep-alive endpoints active: /keep-alive, /ping`);
});
