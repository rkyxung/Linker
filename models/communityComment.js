// models/communityComment.js

const mongoose = require("mongoose");

// 커뮤니티 댓글
const communityCommentSchema = new mongoose.Schema(
  {
    // 게시글 ID
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunityPost",
      required: true,
    },
    // 댓글 작성자
    writer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 댓글 내용
    content: {
      type: String,
      required: true,
      trim: true,
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CommunityComment", communityCommentSchema);

