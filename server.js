require("dotenv").config();
const User = require("./models/User");
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;

const app = express();

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("Mongo connected"))
.catch(err => console.log(err));

const UserSchema = new mongoose.Schema({
    discordId: String,
    username: String,
    avatar: String
});

const User = mongoose.model("User", UserSchema);

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
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
        user = await User.create({
            discordId: profile.id,
            username: profile.username,
            avatar: profile.avatar
        });
    }
    done(null, user);
}));

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("home", { user: req.user });
});

app.get("/dashboard", (req, res) => {
    if (!req.user) return res.redirect("/");
    res.render("dashboard", { user: req.user });
});

app.get("/auth/discord", passport.authenticate("discord"));

app.get("/auth/discord/callback",
    passport.authenticate("discord", { failureRedirect: "/" }),
    (req, res) => {
        res.redirect("/dashboard");
    }
);

app.get("/logout", (req, res) => {
    req.logout(() => {
        res.redirect("/");
    });
});

app.listen(3000, () => console.log("Server running"));
