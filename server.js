require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const multer = require("multer");
const path = require("path");
const User = require("./models/User");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(session({
    secret: "vslauncher-secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_URI);

// ---------- MULTER ----------
const storage = multer.diskStorage({
    destination: "public/uploads",
    filename: (req, file, cb) => {
        cb(null, req.user.id + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ---------- DISCORD ----------
passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ["identify"]
}, async (accessToken, refreshToken, profile, done) => {

    let user = await User.findOne({ discordId: profile.id });

    if (!user) {
        const count = await User.countDocuments();
        user = await User.create({
            discordId: profile.id,
            username: profile.username,
            avatar: profile.avatar
                ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
                : null,
            uid: count + 1
        });
    }

    return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

// ---------- ROUTES ----------

function isAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/auth/discord");
}

app.get("/", (req, res) => {
    res.render("home", { user: req.user });
});

app.get("/auth/discord",
    passport.authenticate("discord")
);

app.get("/auth/discord/callback",
    passport.authenticate("discord", { failureRedirect: "/" }),
    (req, res) => res.redirect("/dashboard")
);

app.get("/dashboard", isAuth, (req, res) => {
    res.render("dashboard", { user: req.user });
});

// ---------- Обновление профиля ----------
app.post("/profile/update", isAuth, upload.single("avatar"), async (req, res) => {

    if (req.body.username) {
        req.user.username = req.body.username;
    }

    if (req.file) {
        req.user.customAvatar = "/uploads/" + req.file.filename;
    }

    await req.user.save();
    res.redirect("/dashboard");
});

// ---------- Скачать ----------
app.get("/download", isAuth, (req, res) => {
    res.download(path.join(__dirname, "public", "VSLauncher.exe"));
});

app.listen(3000, () => console.log("Server running"));
