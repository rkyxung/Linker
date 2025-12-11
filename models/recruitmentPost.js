// models/recruitmentPost.js

const mongoose = require("mongoose");

// 팀원 모집/팀 구하기 글
const recruitmentSchema = new mongoose.Schema(
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
    // 모집 유형: recruit(팀원 모집하기) / find(팀 구하기)
    type: {
      type: String,
      enum: ["recruit", "find"],
      required: true,
    },
    // 카테고리
    // 캠퍼스: project, study
    // 공모전: design, develop, planning
    category: {
      type: String,
      required: true,
    },
    // 모집 마감일
    deadline: {
      type: Date,
      required: true,
    },
    // 모집 상태: recruiting(모집중) / closed(모집완료)
    status: {
      type: String,
      enum: ["recruiting", "closed"],
      default: "recruiting",
    },
    // 모집 인원 수
    recruitCount: {
      type: Number,
      required: true,
      min: 1,
    },
    // 현재 인원 수
    currentCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    // 기술 스택
    techStack: [{
      type: String,
      trim: true,
    }],
    // 포지션
    positions: [{
      type: String,
      trim: true,
    }],
    // 진행 방식: online(온라인) / offline(오프라인) / hybrid(하이브리드)
    method: {
      type: String,
      enum: ["online", "offline", "hybrid"],
      default: "online",
    },
    // 해시태그
    hashtags: [{
      type: String,
      trim: true,
    }],
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
    // 지원자 목록
    applicants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("RecruitmentPost", recruitmentSchema);

