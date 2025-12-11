// models/teamSeekingPost.js
const mongoose = require("mongoose");

// 팀 구하기 글 (자기 PR 위주)
const teamSeekingSchema = new mongoose.Schema(
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
    // 내용 (자기소개, PR)
    content: {
      type: String,
      required: true,
      trim: true,
    },
    // 카테고리
    // 캠퍼스: project, study
    // 공모전: design, develop, planning
    category: {
      type: String,
      required: true,
    },
    // 원하는 분야/프로젝트 유형
    desiredFields: [{
      type: String,
      trim: true,
    }],
    // 보유 기술/스킬
    skills: [{
      type: String,
      trim: true,
    }],
    // 경력/경험 (선택)
    experience: {
      type: String,
      trim: true,
    },
    // 포지션 (원하는 포지션)
    desiredPosition: {
      type: String,
      trim: true,
    },
    // 해시태그
    hashtags: [{
      type: String,
      trim: true,
    }],
    // 마감일
    deadline: {
      type: Date,
      required: true,
    },
    // 스크랩 수
    scraps: {
      type: Number,
      default: 0,
    },
    // 스크랩한 사용자 목록
    scrappedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    // 댓글 수
    comments: {
      type: Number,
      default: 0,
    },
    // 조회수
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TeamSeekingPost", teamSeekingSchema);

