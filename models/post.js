const mongoose = require("mongoose");

// 공고글
const postSchema = new mongoose.Schema(
  {
    // 제목
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // userModel 스키마와 연결
    writer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",         
      required: true,
    },
    // 분야
    field: {
      type: String,        
      required: true,
      trim: true,
    },
    // 글 내용
    content: {
      type: String,        
      required: true,
      trim: true,
    },
    // 해시태그
    hashtags: [
      {
        type: String,      
        trim: true,
      },
    ],
  },
  {
    timestamps: true,      // createdAt, updatedAt 자동 생성
  }
);

// 모델 export
module.exports = mongoose.model("Post", postSchema);
