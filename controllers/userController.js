const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const CommunityPost = require("../models/communityPost");
const CommunityComment = require("../models/communityComment");
const RecruitmentPost = require("../models/recruitmentPost");
const TeamSeekingPost = require("../models/teamSeekingPost");
const UserDescription = require("../models/userDescriptionModel");

// @desc Get all users
// @route GET /users
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find();
  res.render("index", {
    users,
    pageTitle: "회원 목록",
  }); // { users: users } = 키와 값 변수명이 같을 때 축약 가능 => { users }
});
const addUserForm = (req, res) => {
  res.render("add", { pageTitle: "회원 추가", formData: {}, error: null });
};

const showSignIn = (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/");
  }
  res.render("auth/signIn", { error: null, formData: {} });
};

const showSignUp = (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/");
  }
  res.render("auth/signUp", { error: null, formData: {} });
};

// @desc Create a user
// @route POST /users
const createUser = asyncHandler(async (req, res) => {
  const { name, nickname, email, password, redirectTo } = req.body;
  const trimmedName = name ? name.trim() : "";
  const trimmedNickname = nickname ? nickname.trim() : "";
  const normalizedEmail = email ? email.trim().toLowerCase() : "";
  const trimmedPassword = password ? password.trim() : "";

  if (!trimmedName || !trimmedNickname || !normalizedEmail || !trimmedPassword) {
    const errorMessage = "모든 정보를 입력해주세요.";
    if (redirectTo) {
      return res
        .status(400)
        .render("auth/signUp", {
          error: errorMessage,
          formData: { name: trimmedName, nickname: trimmedNickname, email: normalizedEmail },
        });
    }
    return res.status(400).render("add", {
      pageTitle: "회원 추가",
      error: errorMessage,
      formData: { name: trimmedName, nickname: trimmedNickname, email: normalizedEmail },
    });
  }

  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { nickname: trimmedNickname }],
  });

  if (existingUser) {
    const errorMessage = "이미 사용 중인 닉네임 또는 이메일입니다.";
    if (redirectTo) {
      return res.status(409).render("auth/signUp", {
        error: errorMessage,
        formData: { name: trimmedName, nickname: trimmedNickname, email: normalizedEmail },
      });
    }
    return res.status(409).render("add", {
      pageTitle: "회원 추가",
      error: errorMessage,
      formData: { name: trimmedName, nickname: trimmedNickname, email: normalizedEmail },
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
    await User.create({
      name: trimmedName,
      nickname: trimmedNickname,
      email: normalizedEmail,
      password: hashedPassword,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      const errorMessage = "이미 사용 중인 닉네임 또는 이메일입니다.";
      if (redirectTo) {
        return res.status(409).render("auth/signUp", {
          error: errorMessage,
          formData: { name: trimmedName, nickname: trimmedNickname, email: normalizedEmail },
        });
      }
      return res.status(409).render("add", {
        pageTitle: "회원 추가",
        error: errorMessage,
        formData: { name: trimmedName, nickname: trimmedNickname, email: normalizedEmail },
      });
    }
    throw error;
  }
  const target = redirectTo || "/users";
  res.redirect(target);
});

// @desc Get user
// @route GET /users/:id
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.render("update", {
    user,
    pageTitle: "회원정보 수정",
    error: null,
    formData: {
      name: user.name,
      nickname: user.nickname,
      email: user.email,
    },
  });
});

// @desc Update user
// @route PUT /users/:id
const updateUser = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { name, nickname, email, password, currentPassword } = req.body;
  const trimmedName = name ? name.trim() : "";
  const trimmedNickname = nickname ? nickname.trim() : "";
  const normalizedEmail = email ? email.trim().toLowerCase() : "";
  const trimmedPassword = password ? password.trim() : "";
  const trimmedCurrentPassword =
    typeof currentPassword === "string" ? currentPassword.trim() : undefined;
  const isAjax =
    req.xhr ||
    req.headers["x-requested-with"] === "XMLHttpRequest" ||
    (req.headers.accept && req.headers.accept.includes("application/json"));

  const existingUser = await User.findById(id);

  if (!existingUser) {
    res.status(404);
    throw new Error("User not found");
  }

  const formData = {
    name: trimmedName || existingUser.name,
    nickname: trimmedNickname || existingUser.nickname,
    email: normalizedEmail || existingUser.email,
  };

  const respondWithError = (status, message) => {
    if (isAjax) {
      return res.status(status).json({ success: false, message });
    }

    return res.status(status).render("update", {
      user: existingUser,
      pageTitle: "회원정보 수정",
      error: message,
      formData,
    });
  };

  const respondWithSuccess = () => {
    if (isAjax) {
      return res.json({ success: true, message: "회원정보가 수정되었습니다." });
    }

    return res.redirect("/profile");
  };

  if (!trimmedName || !normalizedEmail) {
    return respondWithError(400, "이름과 이메일은 필수 정보입니다.");
  }

  if (typeof trimmedCurrentPassword !== "undefined" && !trimmedCurrentPassword) {
    return respondWithError(400, "현재 비밀번호를 입력해주세요.");
  }

  if (typeof trimmedCurrentPassword !== "undefined") {
    const isCurrentPasswordValid = await bcrypt.compare(trimmedCurrentPassword, existingUser.password);
    if (!isCurrentPasswordValid) {
      return respondWithError(401, "현재 비밀번호가 일치하지 않습니다.");
    }
  }

  const duplicateUser = await User.findOne({
    _id: { $ne: id },
    $or: [{ email: normalizedEmail }, { nickname: trimmedNickname }],
  });

  if (duplicateUser) {
    return respondWithError(409, "이미 사용 중인 닉네임 또는 이메일입니다.");
  }

  existingUser.name = trimmedName;
  if (trimmedNickname) {
    existingUser.nickname = trimmedNickname;
  }
  existingUser.email = normalizedEmail;
  if (trimmedPassword) {
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
    existingUser.password = hashedPassword;
  }

  try {
    await existingUser.save();
  } catch (error) {
    console.error("Error updating user:", error);
    if (error && error.code === 11000) {
      return respondWithError(409, "이미 사용 중인 닉네임 또는 이메일입니다.");
    }
    throw error;
  }

  return respondWithSuccess();
});

const logoutUser = (req, res) => {
  if (req.session) {
    req.session.destroy((error) => {
      if (error) {
        console.error("세션 종료 중 오류가 발생했습니다:", error);
        return res
          .status(500)
          .render("auth/signIn", { error: "로그아웃 처리 중 문제가 발생했습니다. 다시 시도해 주세요.", formData: {} });
      }
      res.clearCookie("connect.sid");
      res.redirect("/login");
    });
  } else {
    res.redirect("/login");
  }
};
// @desc Delete user
// @route DELETE /users/:id
const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // 본인만 탈퇴 가능
  if (!req.session || req.session.userId !== userId) {
    return res.status(403).json({ success: false, message: "본인 계정만 탈퇴할 수 있습니다." });
  }

  // 사용자가 작성한 댓글 목록 (댓글 수 보정용)
  const userCommentCounts = await CommunityComment.aggregate([
    { $match: { writer: userObjectId } },
    { $group: { _id: "$postId", count: { $sum: 1 } } }
  ]);

  // 댓글 삭제
  await CommunityComment.deleteMany({ writer: userObjectId });

  // 댓글 카운트 보정 (커뮤니티/캠퍼스/공모전 공통)
  for (const { _id: postId, count } of userCommentCounts) {
    await Promise.all([
      CommunityPost.updateOne({ _id: postId }, { $inc: { comments: -count } }),
      RecruitmentPost.updateOne({ _id: postId }, { $inc: { comments: -count } }),
      TeamSeekingPost.updateOne({ _id: postId }, { $inc: { comments: -count } }),
    ]);
  }

  // 사용자가 작성한 글과 그 댓글 삭제
  const [recruitPosts, seekPosts, communityPosts] = await Promise.all([
    RecruitmentPost.find({ writer: userObjectId }).select("_id").lean(),
    TeamSeekingPost.find({ writer: userObjectId }).select("_id").lean(),
    CommunityPost.find({ writer: userObjectId }).select("_id").lean(),
  ]);

  const recruitIds = recruitPosts.map(p => p._id);
  const seekIds = seekPosts.map(p => p._id);
  const communityIds = communityPosts.map(p => p._id);

  if (recruitIds.length) await CommunityComment.deleteMany({ postId: { $in: recruitIds } });
  if (seekIds.length) await CommunityComment.deleteMany({ postId: { $in: seekIds } });
  if (communityIds.length) await CommunityComment.deleteMany({ postId: { $in: communityIds } });

  await Promise.all([
    RecruitmentPost.deleteMany({ _id: { $in: recruitIds } }),
    TeamSeekingPost.deleteMany({ _id: { $in: seekIds } }),
    CommunityPost.deleteMany({ _id: { $in: communityIds } }),
  ]);

  // 좋아요/스크랩 참조 제거
  await Promise.all([
    CommunityPost.updateMany(
      { likedBy: userObjectId },
      { $pull: { likedBy: userObjectId }, $inc: { likes: -1 } }
    ),
    CommunityComment.updateMany(
      { likedBy: userObjectId },
      { $pull: { likedBy: userObjectId }, $inc: { likes: -1 } }
    ),
    RecruitmentPost.updateMany(
      { scrappedBy: userObjectId },
      { $pull: { scrappedBy: userObjectId }, $inc: { scraps: -1 } }
    ),
    TeamSeekingPost.updateMany(
      { scrappedBy: userObjectId },
      { $pull: { scrappedBy: userObjectId }, $inc: { scraps: -1 } }
    ),
    UserDescription.deleteOne({ userId: userObjectId })
  ]);

  // 최종 사용자 삭제 및 세션 종료
  await User.findByIdAndDelete(userObjectId);
  
  if (req.session) {
    req.session.destroy((error) => {
      if (error) {
        console.error("세션 종료 중 오류가 발생했습니다:", error);
      }
      res.clearCookie("connect.sid");
      res.redirect("/login");
    });
  } else {
    res.redirect("/login");
  }
});

const loginUser = asyncHandler(async (req, res) => {
  // Login with email + password only
  const { email, password } = req.body;
  const normalizedEmail = email ? email.trim().toLowerCase() : "";
  const trimmedPassword = password ? password.trim() : "";
  const formData = { email: normalizedEmail };

  if (!normalizedEmail || !trimmedPassword) {
    return res
      .status(400)
      .render("auth/signIn", { error: "모든 정보를 입력해주세요.", formData });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res
      .status(401)
      .render("auth/signIn", { error: "일치하는 회원 정보가 없습니다.", formData });
  }

  // 기존 평문 비밀번호와 새 해싱된 비밀번호 모두 지원
  let isPasswordValid = false;
  if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
    // 해싱된 비밀번호인 경우
    isPasswordValid = await bcrypt.compare(trimmedPassword, user.password);
  } else {
    // 평문 비밀번호인 경우 (기존 사용자)
    isPasswordValid = user.password === trimmedPassword;
    // 로그인 성공 시 자동으로 해싱된 비밀번호로 업데이트
    if (isPasswordValid) {
      const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
      user.password = hashedPassword;
      await user.save();
    }
  }

  if (!isPasswordValid) {
    return res
      .status(401)
      .render("auth/signIn", { error: "일치하는 회원 정보가 없습니다.", formData });
  }

  req.session.userId = user._id.toString();
  req.session.nickname = user.nickname;
  req.session.name = user.name;
  req.session.email = user.email;

  res.redirect("/");
});

module.exports = {
  getAllUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  addUserForm,
  showSignIn,
  showSignUp,
  loginUser,
  logoutUser,
};
