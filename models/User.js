const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },

  uid: { type: Number, unique: true },

  username: { type: String, unique: true },

  displayName: String,

  avatar: String,

  friends: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  ],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", UserSchema);
