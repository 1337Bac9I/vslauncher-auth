require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const mongoose = require('mongoose');

const app = express();

mongoose.connect(process.env.MONGO_URI);

const User = mongoose.model('User', new mongoose.Schema({
    discordId: String,
    username: String,
    avatar: String,
    email: String,
    createdAt: { type: Date, default: Date.now }
}));

app.set('view engine', 'ejs');

app.use(session({
    secret: 'supersecret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify', 'email']
},
async (accessToken, refreshToken, profile, done) => {

    let user = await User.findOne({ discordId: profile.id });

    if (!user) {
        user = await User.create({
            discordId: profile.id,
            username: profile.username,
            avatar: profile.avatar,
            email: profile.email
        });
    }

    return done(null, user);
}));

app.get('/', (req, res) => {
    res.render('home', { user: req.user });
});

app.get('/auth/discord',
    passport.authenticate('discord'));

app.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

app.get('/dashboard', (req, res) => {
    if (!req.user) return res.redirect('/');
    res.render('dashboard', { user: req.user });
});

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

app.listen(process.env.PORT || 3000);
