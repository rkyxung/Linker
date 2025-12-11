const mongoose = require("mongoose");

// 커뮤니티 글
const communitySchema = new mongoose.Schema(
  {
    // 제목
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // 글쓴이
    writer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 내용
    content: {
      type: String,
      required: true,
      trim: true,
    },
    // 게시글 종류
    category: {
      type: String,
      enum: ["free", "qna", "info"],
      default: "free",
      required: true,
    },
    // 좋아요 수
    likes: {
      type: Number,
      default: 0,
    },
    // 좋아요한 사용자 목록
    likedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    // 댓글 수
    comments: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CommunityPost", communitySchema);
