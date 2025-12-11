// models/userModel.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nickname: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    password: {
      type: String,
      required: [true, "비밀번호는 꼭 기입해 주세요."],
      trim: true,
    },
    folders: [{
      name: {
        type: String,
        required: true,
        trim: true,
      },
      posts: [{
        postId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        postType: {
          type: String,
          enum: ['recruit', 'seeking', 'community'],
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      }],
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  {
    timestamps: true, 
  }
);

module.exports = mongoose.model("User", userSchema);
