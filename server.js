require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const MongoStore = require("connect-mongo");

const User = require("./models/User");

const app = express();

app.set("view engine", "ejs");

mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.error(err));

app.use(session({
    secret: "vslauncher-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI
    })
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    User.findById(id).then(user => done(null, user));
});

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ["identify"]
}, async (accessToken, refreshToken, profile, done) => {

    let user = await User.findOne({ discordId: profile.id });

    if (!user) {
        const lastUser = await User.findOne().sort({ uid: -1 });
        const nextUID = lastUser ? lastUser.uid + 1 : 1;

        user = await User.create({
            discordId: profile.id,
            username: profile.username,
            avatar: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
            uid: nextUID
        });
    }

    return done(null, user);
}));

app.get("/", (req, res) => {
    res.render("home", { user: req.user });
});

app.get("/auth/discord",
    passport.authenticate("discord")
);

app.get("/auth/discord/callback",
    passport.authenticate("discord", { failureRedirect: "/" }),
    (req, res) => {
        res.redirect("/dashboard");
    }
);

app.get("/dashboard", (req, res) => {
    if (!req.user) return res.redirect("/");
    res.render("dashboard", { user: req.user });
});

app.get("/logout", (req, res) => {
    req.logout(() => {
        res.redirect("/");
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
