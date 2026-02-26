const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    discordId: String,
    username: String,
    avatar: String,          // аватар из Discord
    customAvatar: String,    // загруженный аватар
    uid: Number,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
