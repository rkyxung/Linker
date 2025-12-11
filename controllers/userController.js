const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");

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
    await User.create({
      name: trimmedName,
      nickname: trimmedNickname,
      email: normalizedEmail,
      password: trimmedPassword,
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

  if (
    typeof trimmedCurrentPassword !== "undefined" &&
    trimmedCurrentPassword !== existingUser.password
  ) {
    return respondWithError(401, "현재 비밀번호가 일치하지 않습니다.");
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
    existingUser.password = trimmedPassword;
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
  await User.findByIdAndDelete(req.params.id);
  res.redirect("/");
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
  if (!user || user.password !== trimmedPassword) {
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
