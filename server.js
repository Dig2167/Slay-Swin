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
            adminPassword: 'slay2024admin' // Default password, can be changed
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
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

// API Endpoints
app.post('/api/vote', (req, res) => {
    try {
        const { voter_id, votes } = req.body;

        if (!voter_id || !votes) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const data = readData();

        // Check if this voter already voted
        const existingVoteIndex = data.votes.findIndex(v => v.voter_id === voter_id);
        if (existingVoteIndex !== -1) {
            // Update existing vote
            data.votes[existingVoteIndex] = {
                voter_id,
                votes,
                created_at: new Date().toISOString()
            };
        } else {
            // Add new vote
            data.votes.push({
                voter_id,
                votes,
                created_at: new Date().toISOString()
            });
        }

        writeData(data);

        res.json({
            success: true,
            message: existingVoteIndex !== -1 ? 'Vote updated successfully' : 'Vote recorded successfully'
        });
    } catch (error) {
        console.error('Error saving vote:', error);
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

app.listen(PORT, () => {
    console.log(`🚀 Slay Sving server running on port ${PORT}`);
    console.log(`📊 Data file: ${DATA_FILE}`);
});
