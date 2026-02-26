const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    discordId: { type: String, unique: true },
    username: String,
    avatar: String,
    uid: { type: Number, unique: true },
    customUsername: String,
    customAvatar: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
