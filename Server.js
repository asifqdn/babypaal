const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = 5000;

// MongoDB connection URI
const uri = "mongodb+srv://dbuser:Falak%402743@babypaal.kjaanrn.mongodb.net/tapgame?retryWrites=true&w=majority&appName=babypaal";

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
    origin: 'https://light-dragons-peel.loca.lt', // Allow requests from your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// MongoDB connection
mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define a User schema and model
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    telegramId: { type: Number, unique: true, sparse: true },
    tapCount: { type: Number, default: 0 },
    boosters: { type: Map, of: Boolean, default: { '2x': false, '3x': false, '5x': false, '10x': false, '20x': false } },
    miners: { type: Map, of: Boolean, default: { '2x': false, '3x': false, '5x': false, '10x': false, '20x': false } },
});

const User = mongoose.model('User', userSchema);

// Telegram bot setup
const botToken = 't6998287904:AAGPCND4JgRlqtWO92P-FUyBBiNIKrznUSU'; // Replace with your Telegram bot token

// Routes
app.post('/login', async (req, res) => {
    const { username } = req.body;
    try {
        let user = await User.findOne({ username });
        if (!user) {
            user = new User({ username });
            await user.save();
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to login' });
    }
});

app.get('/user/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const user = await User.findOne({ username });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user' });
    }
});

app.put('/user/:username', async (req, res) => {
    const { username } = req.params;
    const updates = req.body;
    try {
        const user = await User.findOneAndUpdate({ username }, updates, { new: true });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Handle Telegram OAuth callback
app.get('/oauth-callback', async (req, res) => {
    const { hash, payload } = req.query;

    try {
        const secret = crypto.createHash('sha256').update(botToken).digest();
        const checkString = `payload=${payload}`;
        const hmac = crypto.createHmac('sha256', secret).update(checkString).digest('hex');

        if (hmac !== hash) {
            return res.status(400).send('Invalid hash');
        }

        const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
        const user = decodedPayload.user;
        const { id: userId, first_name: firstName, last_name: lastName, username } = user;

        let existingUser = await User.findOne({ telegramId: userId });
        if (!existingUser) {
            existingUser = new User({ telegramId: userId, username, firstName, lastName });
            await existingUser.save();
        }

        // Redirect to the app homepage
        res.redirect('https://light-dragons-peel.loca.lt/home');

    } catch (error) {
        console.error('Error during Telegram authentication:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
