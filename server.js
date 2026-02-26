require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const fetch = require("node-fetch");

const User = require("./models/User");

const app = express();

mongoose.connect(process.env.MONGO_URI);

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "secretkey",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI
    })
  })
);

function checkAuth(req, res, next) {
  if (!req.session.userId) return res.redirect("/");
  next();
}

app.get("/", async (req, res) => {
  let user = null;
  if (req.session.userId) {
    user = await User.findById(req.session.userId);
  }
  res.render("home", { user });
});

app.get("/auth/discord", (req, res) => {
  const redirect = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URI}&response_type=code&scope=identify`;
  res.redirect(redirect);
});

app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.REDIRECT_URI
    })
  });

  const tokenData = await tokenRes.json();

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`
    }
  });

  const profile = await userRes.json();

  let user = await User.findOne({ discordId: profile.id });

  if (!user) {
    const lastUser = await User.findOne().sort({ uid: -1 });
    const nextUid = lastUser ? lastUser.uid + 1 : 1000;

    user = await User.create({
      discordId: profile.id,
      uid: nextUid,
      username: "user" + nextUid,
      displayName: profile.username,
      avatar: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
    });
  }

  req.session.userId = user._id;
  res.redirect("/dashboard");
});

app.get("/dashboard", checkAuth, async (req, res) => {
  const user = await User.findById(req.session.userId).populate("friends");
  res.render("dashboard", { user });
});

app.listen(3000, () => console.log("Server started"));
