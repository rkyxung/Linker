const express = require("express");
// const path = require("path");
const errorhandler = require("./middlewares/errorhandler");
const dbConnect = require("./config/dbConnect");
const methodOverride = require("method-override");
const userController = require("./controllers/userController");
const userDescriptionController = require("./controllers/userDescriptionController");
const User = require("./models/userModel");
const UserDescription = require("./models/userDescriptionModel");
const CommunityPost = require("./models/communityPost");
const CommunityComment = require("./models/communityComment");
const RecruitmentPost = require("./models/recruitmentPost");
const TeamSeekingPost = require("./models/teamSeekingPost");
const mongoose = require("mongoose");
const session = require("express-session");
const userRoutes = require("./routes/userRoutes");
const asyncHandler = require("express-async-handler");

const app = express();
// const router = express.Router();
const port = process.env.PORT || 4000;

// EJS 설정
app.set("view engine", "ejs");


app.use(express.static("./public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(methodOverride("_method"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "linker-secret",
    resave: false,
    saveUninitialized: false,
  })
);

dbConnect();

app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    res.locals.currentUser = {
      id: req.session.userId,
      name: req.session.name,
      nickname: req.session.nickname,
      email: req.session.email,
    };
  } else {
    res.locals.currentUser = null;
  }
  next();
});

const logger = (req, res, next) => {
  console.log("User Logged");
  next();
};

// 함수 등록
// 함수 안에서 응답이 종료되지 않고 다음 함수로 넘길 수 있음
// logger에 next() 사용


const requestTime = (req, res, next) => {
  let today = new Date(); // Date 객체 만들기
  let now = today.toLocaleTimeString(); // 현재 시간을 문자열로 바꾸기
  req.requestTime = now; // req 객체에 requestTime 속성 추가하기
  next();
};

app.use(logger);

//.use()는 미들웨어 함수 바로 밑에
app.use(requestTime); // requestTime 미들웨어 사용

// app.route("/").get((req, res) => {
//   res.status(200).send("Hello Node! 안녕하세요.");
// });

// Auth 미들웨어
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect("/login");
};

// 메인 페이지
app.get("/", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const userDescription = await UserDescription.findOne({ userId }).lean();
  
  // 내가 올린 커뮤니티 글 가져오기
  const myPosts = await CommunityPost.find({ writer: userId })
    .populate("writer", "name nickname")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // 각 게시글에 좋아요 여부 추가
  const myPostsWithLiked = myPosts.map(post => ({
    ...post,
    isLiked: post.likedBy && post.likedBy.some(id => id.toString() === userId)
  }));

  // 스크랩한 글 (캠퍼스/공모전)
  const [scrappedRecruitPosts, scrappedSeekingPosts] = await Promise.all([
    RecruitmentPost.find({ scrappedBy: userId })
      .populate("writer", "name nickname")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    TeamSeekingPost.find({ scrappedBy: userId })
      .populate("writer", "name nickname")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
  ]);

  const scrappedPosts = [
    ...scrappedRecruitPosts.map(post => ({ ...post, postType: "recruit" })),
    ...scrappedSeekingPosts.map(post => ({ ...post, postType: "seeking" }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // 인기글: 캠퍼스 / 공모전 (스크랩 2개 이상 + 조회수 기준)
  const popularCampusRecruit = await RecruitmentPost.find({ 
    category: { $in: ["project", "study"] },
    scraps: { $gte: 2 }
  })
    .populate("writer", "name nickname")
    .sort({ scraps: -1, views: -1, createdAt: -1 })
    .limit(8)
    .lean();
  const popularCampusSeek = await TeamSeekingPost.find({ 
    category: { $in: ["project", "study"] },
    scraps: { $gte: 2 }
  })
    .populate("writer", "name nickname")
    .sort({ scraps: -1, views: -1, createdAt: -1 })
    .limit(8)
    .lean();
  const popularContestRecruit = await RecruitmentPost.find({ 
    category: { $in: ["design", "develop", "planning"] },
    scraps: { $gte: 2 }
  })
    .populate("writer", "name nickname")
    .sort({ scraps: -1, views: -1, createdAt: -1 })
    .limit(8)
    .lean();
  const popularContestSeek = await TeamSeekingPost.find({ 
    category: { $in: ["design", "develop", "planning"] },
    scraps: { $gte: 2 }
  })
    .populate("writer", "name nickname")
    .sort({ scraps: -1, views: -1, createdAt: -1 })
    .limit(8)
    .lean();

  const user = await User.findById(userId).lean();
  const folders = user ? (user.folders || []) : [];

  const popularCampus = [
    ...popularCampusRecruit.map(post => ({ 
      ...post, 
      postType: "recruit",
      isScrapped: post.scrappedBy && post.scrappedBy.some(id => id.toString() === userId)
    })),
    ...popularCampusSeek.map(post => ({ 
      ...post, 
      postType: "seeking",
      isScrapped: post.scrappedBy && post.scrappedBy.some(id => id.toString() === userId)
    }))
  ];
  const popularContest = [
    ...popularContestRecruit.map(post => ({ 
      ...post, 
      postType: "recruit",
      isScrapped: post.scrappedBy && post.scrappedBy.some(id => id.toString() === userId)
    })),
    ...popularContestSeek.map(post => ({ 
      ...post, 
      postType: "seeking",
      isScrapped: post.scrappedBy && post.scrappedBy.some(id => id.toString() === userId)
    }))
  ];

  res.render("main", {
    userDescription: userDescription || {},
    myPosts: myPostsWithLiked || [],
    scrappedPosts: scrappedPosts || [],
    popularCampus: popularCampus || [],
    popularContest: popularContest || [],
    folders: folders,
    currentUser: user
  });
}));

// 인증 관련 라우트
app.get("/login", userController.showSignIn);
app.post("/login", userController.loginUser);
app.get("/register", userController.showSignUp);
app.post("/register", userController.createUser);
app.post("/logout", userController.logoutUser);

// 프로필 정보 조회
app.get("/profile", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const [user, userDescription] = await Promise.all([
      User.findById(userId).lean(),
      UserDescription.findOne({ userId }).lean()
    ]);

    if (!user) {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    res.render("profile", {
      pageTitle: "마이페이지",
      userDescription: userDescription || {},
      folders: user.folders || []
    });
  } catch (error) {
    next(error);
  }
});

// 프로필 정보 업데이트
app.post("/user-description/update", requireAuth, userDescriptionController.updateUserDescription);

// 캠퍼스 페이지
app.get("/campus", requireAuth, asyncHandler(async (req, res) => {
  const sort = req.query.sort || 'all'; // all, latest, popular
  let sortOption = { createdAt: -1 };
  
  const userId = req.session.userId;
  let recruitPosts, seekingPosts;
  
  if (sort === 'latest') {
    sortOption = { createdAt: -1 };
    recruitPosts = await RecruitmentPost.find({ category: { $in: ['project', 'study'] } })
      .populate("writer", "name nickname")
      .sort(sortOption)
      .lean();
    seekingPosts = await TeamSeekingPost.find({ category: { $in: ['project', 'study'] } })
      .populate("writer", "name nickname")
      .sort(sortOption)
      .lean();
  } else if (sort === 'popular') {
    sortOption = { scraps: -1, views: -1 };
    // 인기 탭: 스크랩 2개 이상만 표시
    recruitPosts = await RecruitmentPost.find({ 
      category: { $in: ['project', 'study'] },
      scraps: { $gte: 2 }
    })
      .populate("writer", "name nickname")
      .sort(sortOption)
      .lean();
    seekingPosts = await TeamSeekingPost.find({ 
      category: { $in: ['project', 'study'] },
      scraps: { $gte: 2 }
    })
      .populate("writer", "name nickname")
      .sort(sortOption)
      .lean();
  } else {
    sortOption = { createdAt: -1 };
    recruitPosts = await RecruitmentPost.find({ category: { $in: ['project', 'study'] } })
      .populate("writer", "name nickname")
      .sort(sortOption)
      .lean();
    seekingPosts = await TeamSeekingPost.find({ category: { $in: ['project', 'study'] } })
      .populate("writer", "name nickname")
      .sort(sortOption)
      .lean();
  }
  
  // 두 타입의 글을 합치고 날짜순 정렬
  const allPosts = [...recruitPosts.map(p => ({ ...p, postType: 'recruit' })), ...seekingPosts.map(p => ({ ...p, postType: 'seeking' }))];
  allPosts.sort((a, b) => {
    if (sort === 'latest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sort === 'popular') {
      return (b.scraps || 0) - (a.scraps || 0) || (b.views || 0) - (a.views || 0);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  // 각 게시글에 스크랩 여부 추가
  const allPostsWithScrapped = allPosts.map(post => ({
    ...post,
    isScrapped: post.scrappedBy && post.scrappedBy.some(id => id.toString() === userId)
  }));
  
  const user = await User.findById(userId).lean();
  const folders = user ? (user.folders || []) : [];
  
  res.render("campus", {
    pageTitle: "캠퍼스",
    posts: allPostsWithScrapped || [],
    currentSort: sort,
    folders: folders
  });
}));

// 캠퍼스 팀원 모집하기 글 작성 폼
app.get("/campus/add", requireAuth, (req, res) => {
  res.render("campus/add", {
    pageTitle: "팀원 모집하기"
  });
});

// 캠퍼스 팀원 모집하기 글 수정 폼
app.get("/campus/:id/edit", requireAuth, asyncHandler(async (req, res) => {
  const post = await RecruitmentPost.findById(req.params.id).lean();
  if (!post) return res.status(404).send("Not found");
  res.render("campus/add", {
    pageTitle: "팀원 모집 글 수정",
    editMode: true,
    formAction: `/campus/${post._id}?_method=PUT`,
    formData: {
      ...post,
      positions: post.positions ? post.positions.join(", ") : "",
      hashtags: post.hashtags ? post.hashtags.map(h => `#${h}`).join(", ") : ""
    }
  });
}));

// 캠퍼스 팀원 모집하기 글 작성 처리
app.post("/campus/add", requireAuth, asyncHandler(async (req, res) => {
  const { title, content, category, deadline, recruitCount, positions, hashtags } = req.body;
  const userId = req.session.userId;

  if (!title || !content || !category || !deadline || !recruitCount) {
    return res.status(400).render("campus/add", {
      pageTitle: "팀원 모집하기",
      error: "필수 항목을 모두 입력해주세요.",
      formData: req.body
    });
  }

  // 배열 필드 처리
  const positionsArray = positions ? positions.split(',').map(p => p.trim()).filter(p => p) : [];
  const hashtagsArray = hashtags ? hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(h => h) : [];

  await RecruitmentPost.create({
    title: title.trim(),
    content: content.trim(),
    type: "recruit",
    category: category,
    deadline: new Date(deadline),
    recruitCount: parseInt(recruitCount),
    positions: positionsArray,
    hashtags: hashtagsArray,
    writer: userId,
    scraps: 0,
    comments: 0,
    views: 0
  });

  res.redirect("/campus");
}));

// 캠퍼스 팀원 모집하기 글 수정 처리
app.put("/campus/:id", requireAuth, asyncHandler(async (req, res) => {
  const { title, content, category, deadline, recruitCount, positions, hashtags } = req.body;
  if (!title || !content || !category || !deadline || !recruitCount) {
    return res.status(400).render("campus/add", {
      pageTitle: "팀원 모집 글 수정",
      error: "필수 항목을 모두 입력해주세요.",
      editMode: true,
      formAction: `/campus/${req.params.id}?_method=PUT`,
      formData: req.body
    });
  }
  const positionsArray = positions ? positions.split(',').map(p => p.trim()).filter(p => p) : [];
  const hashtagsArray = hashtags ? hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(h => h) : [];
  await RecruitmentPost.findByIdAndUpdate(req.params.id, {
    title: title.trim(),
    content: content.trim(),
    category,
    deadline: new Date(deadline),
    recruitCount: parseInt(recruitCount),
    positions: positionsArray,
    hashtags: hashtagsArray
  });
  res.redirect("/campus");
}));

// 캠퍼스 팀 구하기 글 작성 폼
app.get("/campus/seek", requireAuth, (req, res) => {
  res.render("campus/seek", {
    pageTitle: "팀 구하기"
  });
});

// 캠퍼스 팀 구하기 글 수정 폼
app.get("/campus/seek/:id/edit", requireAuth, asyncHandler(async (req, res) => {
  const post = await TeamSeekingPost.findById(req.params.id).lean();
  if (!post) return res.status(404).send("Not found");
  res.render("campus/seek", {
    pageTitle: "팀 구하기 글 수정",
    editMode: true,
    formAction: `/campus/seek/${post._id}?_method=PUT`,
    formData: {
      ...post,
      desiredFields: post.desiredFields ? post.desiredFields.join(", ") : "",
      skills: post.skills ? post.skills.join(", ") : "",
      hashtags: post.hashtags ? post.hashtags.map(h => `#${h}`).join(", ") : ""
    }
  });
}));

// 캠퍼스 팀 구하기 글 작성 처리
app.post("/campus/seek", requireAuth, asyncHandler(async (req, res) => {
  const { title, content, category, desiredFields, skills, experience, desiredPosition, hashtags } = req.body;
  const userId = req.session.userId;

  if (!title || !content || !category) {
    return res.status(400).render("campus/seek", {
      pageTitle: "팀 구하기",
      error: "필수 항목을 모두 입력해주세요.",
      formData: req.body
    });
  }

  // 배열 필드 처리
  const desiredFieldsArray = desiredFields ? desiredFields.split(',').map(f => f.trim()).filter(f => f) : [];
  const skillsArray = skills ? skills.split(',').map(s => s.trim()).filter(s => s) : [];
  const hashtagsArray = hashtags ? hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(h => h) : [];

  await TeamSeekingPost.create({
    title: title.trim(),
    content: content.trim(),
    category: category,
    desiredFields: desiredFieldsArray,
    skills: skillsArray,
    experience: experience ? experience.trim() : '',
    desiredPosition: desiredPosition ? desiredPosition.trim() : '',
    hashtags: hashtagsArray,
    writer: userId,
    scraps: 0,
    comments: 0,
    views: 0
  });

  res.redirect("/campus");
}));

// 캠퍼스 팀 구하기 글 수정 처리
app.put("/campus/seek/:id", requireAuth, asyncHandler(async (req, res) => {
  const { title, content, category, desiredFields, skills, experience, desiredPosition, hashtags } = req.body;
  if (!title || !content || !category) {
    return res.status(400).render("campus/seek", {
      pageTitle: "팀 구하기 글 수정",
      error: "필수 항목을 모두 입력해주세요.",
      editMode: true,
      formAction: `/campus/seek/${req.params.id}?_method=PUT`,
      formData: req.body
    });
  }
  const desiredFieldsArray = desiredFields ? desiredFields.split(',').map(f => f.trim()).filter(f => f) : [];
  const skillsArray = skills ? skills.split(',').map(s => s.trim()).filter(s => s) : [];
  const hashtagsArray = hashtags ? hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(h => h) : [];
  await TeamSeekingPost.findByIdAndUpdate(req.params.id, {
    title: title.trim(),
    content: content.trim(),
    category,
    desiredFields: desiredFieldsArray,
    skills: skillsArray,
    experience: experience ? experience.trim() : '',
    desiredPosition: desiredPosition ? desiredPosition.trim() : '',
    hashtags: hashtagsArray
  });
  res.redirect("/campus");
}));

// 공모전 페이지
app.get("/contest", requireAuth, asyncHandler(async (req, res) => {
  const sort = req.query.sort || 'all'; // all, latest, popular
  const userId = req.session.userId;
  let recruitPosts, seekingPosts;
  let sortOption = { createdAt: -1 };
  
  if (sort === 'latest') {
    sortOption = { createdAt: -1 };
    recruitPosts = await RecruitmentPost.find({ category: { $in: ['design', 'develop', 'planning'] } })
      .populate("writer", "name nickname")
      .sort(sortOption)
      .lean();
    seekingPosts = await TeamSeekingPost.find({ category: { $in: ['design', 'develop', 'planning'] } })
      .populate("writer", "name nickname")
      .sort(sortOption)
      .lean();
  } else if (sort === 'popular') {
    sortOption = { scraps: -1, views: -1 };
    // 인기 탭: 스크랩 2개 이상만 표시
    recruitPosts = await RecruitmentPost.find({ 
      category: { $in: ['design', 'develop', 'planning'] },
      scraps: { $gte: 2 }
    })
      .populate("writer", "name nickname")
      .sort(sortOption)
      .lean();
    seekingPosts = await TeamSeekingPost.find({ 
      category: { $in: ['design', 'develop', 'planning'] },
      scraps: { $gte: 2 }
    })
      .populate("writer", "name nickname")
      .sort(sortOption)
      .lean();
  } else {
    sortOption = { createdAt: -1 };
    recruitPosts = await RecruitmentPost.find({ category: { $in: ['design', 'develop', 'planning'] } })
      .populate("writer", "name nickname")
      .sort(sortOption)
      .lean();
    seekingPosts = await TeamSeekingPost.find({ category: { $in: ['design', 'develop', 'planning'] } })
      .populate("writer", "name nickname")
      .sort(sortOption)
      .lean();
  }
  
  // 두 타입의 글을 합치고 날짜순 정렬
  const allPosts = [...recruitPosts.map(p => ({ ...p, postType: 'recruit' })), ...seekingPosts.map(p => ({ ...p, postType: 'seeking' }))];
  allPosts.sort((a, b) => {
    if (sort === 'latest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sort === 'popular') {
      return (b.scraps || 0) - (a.scraps || 0) || (b.views || 0) - (a.views || 0);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  // 각 게시글에 스크랩 여부 추가
  const allPostsWithScrapped = allPosts.map(post => ({
    ...post,
    isScrapped: post.scrappedBy && post.scrappedBy.some(id => id.toString() === userId)
  }));
  
  const user = await User.findById(userId).lean();
  const folders = user ? (user.folders || []) : [];
  
  res.render("contest", {
    pageTitle: "공모전",
    posts: allPostsWithScrapped || [],
    currentSort: sort,
    folders: folders
  });
}));

// 공모전 팀원 모집하기 글 작성 폼
app.get("/contest/add", requireAuth, (req, res) => {
  res.render("contest/add", {
    pageTitle: "팀원 모집하기"
  });
});

// 공모전 팀원 모집하기 글 수정 폼
app.get("/contest/:id/edit", requireAuth, asyncHandler(async (req, res) => {
  const post = await RecruitmentPost.findById(req.params.id).lean();
  if (!post) return res.status(404).send("Not found");
  res.render("contest/add", {
    pageTitle: "팀원 모집 글 수정",
    editMode: true,
    formAction: `/contest/${post._id}?_method=PUT`,
    formData: {
      ...post,
      positions: post.positions ? post.positions.join(", ") : "",
      hashtags: post.hashtags ? post.hashtags.map(h => `#${h}`).join(", ") : ""
    }
  });
}));

// 공모전 팀원 모집하기 글 작성 처리
app.post("/contest/add", requireAuth, asyncHandler(async (req, res) => {
  const { title, content, category, deadline, recruitCount, positions, hashtags } = req.body;
  const userId = req.session.userId;

  if (!title || !content || !category || !deadline || !recruitCount) {
    return res.status(400).render("contest/add", {
      pageTitle: "팀원 모집하기",
      error: "필수 항목을 모두 입력해주세요.",
      formData: req.body
    });
  }

  // 배열 필드 처리
  const positionsArray = positions ? positions.split(',').map(p => p.trim()).filter(p => p) : [];
  const hashtagsArray = hashtags ? hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(h => h) : [];

  await RecruitmentPost.create({
    title: title.trim(),
    content: content.trim(),
    type: "recruit",
    category: category,
    deadline: new Date(deadline),
    recruitCount: parseInt(recruitCount),
    positions: positionsArray,
    hashtags: hashtagsArray,
    writer: userId,
    scraps: 0,
    comments: 0,
    views: 0
  });

  res.redirect("/contest");
}));

// 공모전 팀원 모집하기 글 수정 처리
app.put("/contest/:id", requireAuth, asyncHandler(async (req, res) => {
  const { title, content, category, deadline, recruitCount, positions, hashtags } = req.body;
  if (!title || !content || !category || !deadline || !recruitCount) {
    return res.status(400).render("contest/add", {
      pageTitle: "팀원 모집 글 수정",
      error: "필수 항목을 모두 입력해주세요.",
      editMode: true,
      formAction: `/contest/${req.params.id}?_method=PUT`,
      formData: req.body
    });
  }
  const positionsArray = positions ? positions.split(',').map(p => p.trim()).filter(p => p) : [];
  const hashtagsArray = hashtags ? hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(h => h) : [];
  await RecruitmentPost.findByIdAndUpdate(req.params.id, {
    title: title.trim(),
    content: content.trim(),
    category,
    deadline: new Date(deadline),
    recruitCount: parseInt(recruitCount),
    positions: positionsArray,
    hashtags: hashtagsArray
  });
  res.redirect("/contest");
}));

// 공모전 팀 구하기 글 작성 폼
app.get("/contest/seek", requireAuth, (req, res) => {
  res.render("contest/seek", {
    pageTitle: "팀 구하기"
  });
});

// 공모전 팀 구하기 글 수정 폼
app.get("/contest/seek/:id/edit", requireAuth, asyncHandler(async (req, res) => {
  const post = await TeamSeekingPost.findById(req.params.id).lean();
  if (!post) return res.status(404).send("Not found");
  res.render("contest/seek", {
    pageTitle: "팀 구하기 글 수정",
    editMode: true,
    formAction: `/contest/seek/${post._id}?_method=PUT`,
    formData: {
      ...post,
      desiredFields: post.desiredFields ? post.desiredFields.join(", ") : "",
      skills: post.skills ? post.skills.join(", ") : "",
      hashtags: post.hashtags ? post.hashtags.map(h => `#${h}`).join(", ") : ""
    }
  });
}));

// 공모전 팀 구하기 글 작성 처리
app.post("/contest/seek", requireAuth, asyncHandler(async (req, res) => {
  const { title, content, category, desiredFields, skills, experience, desiredPosition, hashtags } = req.body;
  const userId = req.session.userId;

  if (!title || !content || !category) {
    return res.status(400).render("contest/seek", {
      pageTitle: "팀 구하기",
      error: "필수 항목을 모두 입력해주세요.",
      formData: req.body
    });
  }

  // 배열 필드 처리
  const desiredFieldsArray = desiredFields ? desiredFields.split(',').map(f => f.trim()).filter(f => f) : [];
  const skillsArray = skills ? skills.split(',').map(s => s.trim()).filter(s => s) : [];
  const hashtagsArray = hashtags ? hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(h => h) : [];

  await TeamSeekingPost.create({
    title: title.trim(),
    content: content.trim(),
    category: category,
    desiredFields: desiredFieldsArray,
    skills: skillsArray,
    experience: experience ? experience.trim() : '',
    desiredPosition: desiredPosition ? desiredPosition.trim() : '',
    hashtags: hashtagsArray,
    writer: userId,
    scraps: 0,
    comments: 0,
    views: 0
  });

  res.redirect("/contest");
}));

// 공모전 팀 구하기 글 수정 처리
app.put("/contest/seek/:id", requireAuth, asyncHandler(async (req, res) => {
  const { title, content, category, desiredFields, skills, experience, desiredPosition, hashtags } = req.body;
  if (!title || !content || !category) {
    return res.status(400).render("contest/seek", {
      pageTitle: "팀 구하기 글 수정",
      error: "필수 항목을 모두 입력해주세요.",
      editMode: true,
      formAction: `/contest/seek/${req.params.id}?_method=PUT`,
      formData: req.body
    });
  }
  const desiredFieldsArray = desiredFields ? desiredFields.split(',').map(f => f.trim()).filter(f => f) : [];
  const skillsArray = skills ? skills.split(',').map(s => s.trim()).filter(s => s) : [];
  const hashtagsArray = hashtags ? hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(h => h) : [];
  await TeamSeekingPost.findByIdAndUpdate(req.params.id, {
    title: title.trim(),
    content: content.trim(),
    category,
    desiredFields: desiredFieldsArray,
    skills: skillsArray,
    experience: experience ? experience.trim() : '',
    desiredPosition: desiredPosition ? desiredPosition.trim() : '',
    hashtags: hashtagsArray
  });
  res.redirect("/contest");
}));

// 캠퍼스 팀원 모집하기 글 상세 페이지
app.get("/campus/:id", requireAuth, asyncHandler(async (req, res) => {
  const post = await RecruitmentPost.findById(req.params.id)
    .populate("writer", "name nickname")
    .lean();

  if (!post) {
    return res.status(404).render("error", {
      pageTitle: "Linker",
      message: "요청하신 글이 존재하지 않습니다."
    });
  }

  // 조회수 증가
  await RecruitmentPost.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

  const isOwner = post.writer && post.writer._id.toString() === req.session.userId;
  const isScrapped = post.scrappedBy && post.scrappedBy.some(id => id.toString() === req.session.userId);

  // 댓글 가져오기 (CommunityComment를 재사용)
  const comments = await CommunityComment.find({ postId: post._id })
    .populate("writer", "name nickname")
    .sort({ createdAt: 1 })
    .lean();

  const commentsWithLiked = comments.map(comment => ({
    ...comment,
    isLiked: comment.likedBy && comment.likedBy.some(id => id.toString() === req.session.userId),
    isCommentOwner: comment.writer && comment.writer._id.toString() === req.session.userId
  }));

  // 사용자 폴더 목록 가져오기
  const user = await User.findById(req.session.userId).lean();
  const folders = user ? (user.folders || []) : [];

  res.render("campus/detail", {
    pageTitle: "Linker",
    post: post,
    isOwner: isOwner,
    isScrapped: isScrapped,
    comments: commentsWithLiked,
    folders: folders,
    postType: 'recruit',
    getRelativeTime: getRelativeTime
  });
}));

// 캠퍼스 팀 구하기 글 상세 페이지
app.get("/campus/seek/:id", requireAuth, asyncHandler(async (req, res) => {
  const post = await TeamSeekingPost.findById(req.params.id)
    .populate("writer", "name nickname")
    .lean();

  if (!post) {
    return res.status(404).render("error", {
      pageTitle: "Linker",
      message: "요청하신 글이 존재하지 않습니다."
    });
  }

  // 조회수 증가
  await TeamSeekingPost.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

  const isOwner = post.writer && post.writer._id.toString() === req.session.userId;
  const isScrapped = post.scrappedBy && post.scrappedBy.some(id => id.toString() === req.session.userId);

  // 댓글 가져오기 (CommunityComment를 재사용)
  const comments = await CommunityComment.find({ postId: post._id })
    .populate("writer", "name nickname")
    .sort({ createdAt: 1 })
    .lean();

  const commentsWithLiked = comments.map(comment => ({
    ...comment,
    isLiked: comment.likedBy && comment.likedBy.some(id => id.toString() === req.session.userId),
    isCommentOwner: comment.writer && comment.writer._id.toString() === req.session.userId
  }));

  // 사용자 폴더 목록 가져오기
  const user = await User.findById(req.session.userId).lean();
  const folders = user ? (user.folders || []) : [];

  res.render("campus/seek/detail", {
    pageTitle: "Linker",
    post: post,
    isOwner: isOwner,
    isScrapped: isScrapped,
    comments: commentsWithLiked,
    folders: folders,
    postType: 'seeking',
    getRelativeTime: getRelativeTime
  });
}));

// 공모전 팀원 모집하기 글 상세 페이지
app.get("/contest/:id", requireAuth, asyncHandler(async (req, res) => {
  const post = await RecruitmentPost.findById(req.params.id)
    .populate("writer", "name nickname")
    .lean();

  if (!post) {
    return res.status(404).render("error", {
      pageTitle: "Linker",
      message: "요청하신 글이 존재하지 않습니다."
    });
  }

  // 조회수 증가
  await RecruitmentPost.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

  const isOwner = post.writer && post.writer._id.toString() === req.session.userId;
  const isScrapped = post.scrappedBy && post.scrappedBy.some(id => id.toString() === req.session.userId);

  // 댓글 가져오기 (CommunityComment를 재사용)
  const comments = await CommunityComment.find({ postId: post._id })
    .populate("writer", "name nickname")
    .sort({ createdAt: 1 })
    .lean();

  const commentsWithLiked = comments.map(comment => ({
    ...comment,
    isLiked: comment.likedBy && comment.likedBy.some(id => id.toString() === req.session.userId),
    isCommentOwner: comment.writer && comment.writer._id.toString() === req.session.userId
  }));

  // 사용자 폴더 목록 가져오기
  const user = await User.findById(req.session.userId).lean();
  const folders = user ? (user.folders || []) : [];

  res.render("contest/detail", {
    pageTitle: "Linker",
    post: post,
    isOwner: isOwner,
    isScrapped: isScrapped,
    comments: commentsWithLiked,
    folders: folders,
    postType: 'recruit',
    getRelativeTime: getRelativeTime
  });
}));

// 공모전 팀 구하기 글 상세 페이지
app.get("/contest/seek/:id", requireAuth, asyncHandler(async (req, res) => {
  const post = await TeamSeekingPost.findById(req.params.id)
    .populate("writer", "name nickname")
    .lean();

  if (!post) {
    return res.status(404).render("error", {
      pageTitle: "Linker",
      message: "요청하신 글이 존재하지 않습니다."
    });
  }

  // 조회수 증가
  await TeamSeekingPost.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

  const isOwner = post.writer && post.writer._id.toString() === req.session.userId;
  const isScrapped = post.scrappedBy && post.scrappedBy.some(id => id.toString() === req.session.userId);

  // 댓글 가져오기 (CommunityComment를 재사용)
  const comments = await CommunityComment.find({ postId: post._id })
    .populate("writer", "name nickname")
    .sort({ createdAt: 1 })
    .lean();

  const commentsWithLiked = comments.map(comment => ({
    ...comment,
    isLiked: comment.likedBy && comment.likedBy.some(id => id.toString() === req.session.userId),
    isCommentOwner: comment.writer && comment.writer._id.toString() === req.session.userId
  }));

  // 사용자 폴더 목록 가져오기
  const user = await User.findById(req.session.userId).lean();
  const folders = user ? (user.folders || []) : [];

  res.render("contest/seek/detail", {
    pageTitle: "Linker",
    post: post,
    isOwner: isOwner,
    isScrapped: isScrapped,
    comments: commentsWithLiked,
    folders: folders,
    postType: 'seeking',
    getRelativeTime: getRelativeTime
  });
}));

// 캠퍼스 팀원 모집하기 글 스크랩 토글
app.post("/campus/:id/scrap", requireAuth, asyncHandler(async (req, res) => {
  const post = await RecruitmentPost.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, message: "글을 찾을 수 없습니다." });
  }

  const userId = req.session.userId;
  const scrappedIndex = post.scrappedBy.findIndex(id => id.toString() === userId);

  // 스크랩 전 상태 저장
  const wasScrapped = scrappedIndex > -1;

  if (scrappedIndex > -1) {
    // 스크랩 제거
    post.scrappedBy.splice(scrappedIndex, 1);
  } else {
    // 스크랩 추가
    post.scrappedBy.push(userId);
  }

  // scraps를 항상 scrappedBy 배열의 길이로 동기화
  post.scraps = post.scrappedBy.length;

  await post.save();
  // 스크랩 후 상태를 반환 (wasScrapped가 false면 스크랩 추가, true면 제거)
  res.json({ success: true, scraps: post.scraps, isScrapped: !wasScrapped });
}));

// 캠퍼스 팀 구하기 글 스크랩 토글
app.post("/campus/seek/:id/scrap", requireAuth, asyncHandler(async (req, res) => {
  const post = await TeamSeekingPost.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, message: "글을 찾을 수 없습니다." });
  }

  const userId = req.session.userId;
  const scrappedIndex = post.scrappedBy.findIndex(id => id.toString() === userId);

  // 스크랩 전 상태 저장
  const wasScrapped = scrappedIndex > -1;

  if (scrappedIndex > -1) {
    // 스크랩 제거
    post.scrappedBy.splice(scrappedIndex, 1);
  } else {
    // 스크랩 추가
    post.scrappedBy.push(userId);
  }

  // scraps를 항상 scrappedBy 배열의 길이로 동기화
  post.scraps = post.scrappedBy.length;

  await post.save();
  // 스크랩 후 상태를 반환 (wasScrapped가 false면 스크랩 추가, true면 제거)
  res.json({ success: true, scraps: post.scraps, isScrapped: !wasScrapped });
}));

// 공모전 팀원 모집하기 글 스크랩 토글
app.post("/contest/:id/scrap", requireAuth, asyncHandler(async (req, res) => {
  const post = await RecruitmentPost.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, message: "글을 찾을 수 없습니다." });
  }

  const userId = req.session.userId;
  const scrappedIndex = post.scrappedBy.findIndex(id => id.toString() === userId);

  // 스크랩 전 상태 저장
  const wasScrapped = scrappedIndex > -1;

  if (scrappedIndex > -1) {
    // 스크랩 제거
    post.scrappedBy.splice(scrappedIndex, 1);
  } else {
    // 스크랩 추가
    post.scrappedBy.push(userId);
  }

  // scraps를 항상 scrappedBy 배열의 길이로 동기화
  post.scraps = post.scrappedBy.length;

  await post.save();
  // 스크랩 후 상태를 반환 (wasScrapped가 false면 스크랩 추가, true면 제거)
  res.json({ success: true, scraps: post.scraps, isScrapped: !wasScrapped });
}));

// 공모전 팀 구하기 글 스크랩 토글
app.post("/contest/seek/:id/scrap", requireAuth, asyncHandler(async (req, res) => {
  const post = await TeamSeekingPost.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, message: "글을 찾을 수 없습니다." });
  }

  const userId = req.session.userId;
  const scrappedIndex = post.scrappedBy.findIndex(id => id.toString() === userId);

  // 스크랩 전 상태 저장
  const wasScrapped = scrappedIndex > -1;

  if (scrappedIndex > -1) {
    // 스크랩 제거
    post.scrappedBy.splice(scrappedIndex, 1);
  } else {
    // 스크랩 추가
    post.scrappedBy.push(userId);
  }

  // scraps를 항상 scrappedBy 배열의 길이로 동기화
  post.scraps = post.scrappedBy.length;

  await post.save();
  // 스크랩 후 상태를 반환 (wasScrapped가 false면 스크랩 추가, true면 제거)
  res.json({ success: true, scraps: post.scraps, isScrapped: !wasScrapped });
}));

// 캠퍼스 팀원 모집하기 글 댓글 작성
app.post("/campus/:id/comment", requireAuth, asyncHandler(async (req, res) => {
  const { content } = req.body;
  const postId = req.params.id;
  const userId = req.session.userId;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: "댓글 내용을 입력해주세요." });
  }

  const post = await RecruitmentPost.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: "글을 찾을 수 없습니다." });
  }

  const comment = await CommunityComment.create({
    postId: postId,
    writer: userId,
    content: content.trim(),
    likes: 0
  });

  post.comments += 1;
  await post.save();

  const commentWithWriter = await CommunityComment.findById(comment._id)
    .populate("writer", "name nickname")
    .lean();

  res.json({ success: true, comment: commentWithWriter, commentCount: post.comments });
}));

// 캠퍼스 팀 구하기 글 댓글 작성
app.post("/campus/seek/:id/comment", requireAuth, asyncHandler(async (req, res) => {
  const { content } = req.body;
  const postId = req.params.id;
  const userId = req.session.userId;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: "댓글 내용을 입력해주세요." });
  }

  const post = await TeamSeekingPost.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: "글을 찾을 수 없습니다." });
  }

  const comment = await CommunityComment.create({
    postId: postId,
    writer: userId,
    content: content.trim(),
    likes: 0
  });

  post.comments += 1;
  await post.save();

  const commentWithWriter = await CommunityComment.findById(comment._id)
    .populate("writer", "name nickname")
    .lean();

  res.json({ success: true, comment: commentWithWriter, commentCount: post.comments });
}));

// 공모전 팀원 모집하기 글 댓글 작성
app.post("/contest/:id/comment", requireAuth, asyncHandler(async (req, res) => {
  const { content } = req.body;
  const postId = req.params.id;
  const userId = req.session.userId;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: "댓글 내용을 입력해주세요." });
  }

  const post = await RecruitmentPost.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: "글을 찾을 수 없습니다." });
  }

  const comment = await CommunityComment.create({
    postId: postId,
    writer: userId,
    content: content.trim(),
    likes: 0
  });

  post.comments += 1;
  await post.save();

  const commentWithWriter = await CommunityComment.findById(comment._id)
    .populate("writer", "name nickname")
    .lean();

  res.json({ success: true, comment: commentWithWriter, commentCount: post.comments });
}));

// 공모전 팀 구하기 글 댓글 작성
app.post("/contest/seek/:id/comment", requireAuth, asyncHandler(async (req, res) => {
  const { content } = req.body;
  const postId = req.params.id;
  const userId = req.session.userId;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: "댓글 내용을 입력해주세요." });
  }

  const post = await TeamSeekingPost.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: "글을 찾을 수 없습니다." });
  }

  const comment = await CommunityComment.create({
    postId: postId,
    writer: userId,
    content: content.trim(),
    likes: 0
  });

  post.comments += 1;
  await post.save();

  const commentWithWriter = await CommunityComment.findById(comment._id)
    .populate("writer", "name nickname")
    .lean();

  res.json({ success: true, comment: commentWithWriter, commentCount: post.comments });
}));

// 캠퍼스 글 삭제
app.post("/campus/:id", requireAuth, asyncHandler(async (req, res) => {
  if (req.body._method === 'DELETE') {
    const post = await RecruitmentPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: "글을 찾을 수 없습니다." });
    }

    if (post.writer.toString() !== req.session.userId) {
      return res.status(403).json({ success: false, message: "삭제 권한이 없습니다." });
    }

    await CommunityComment.deleteMany({ postId: post._id });
    await RecruitmentPost.findByIdAndDelete(req.params.id);

    return res.json({ success: true, message: "글이 삭제되었습니다." });
  }
  res.status(400).json({ success: false, message: "잘못된 요청입니다." });
}));

// 공모전 글 삭제
app.post("/contest/:id", requireAuth, asyncHandler(async (req, res) => {
  if (req.body._method === 'DELETE') {
    const post = await RecruitmentPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: "글을 찾을 수 없습니다." });
    }

    if (post.writer.toString() !== req.session.userId) {
      return res.status(403).json({ success: false, message: "삭제 권한이 없습니다." });
    }

    await CommunityComment.deleteMany({ postId: post._id });
    await RecruitmentPost.findByIdAndDelete(req.params.id);

    return res.json({ success: true, message: "글이 삭제되었습니다." });
  }
  res.status(400).json({ success: false, message: "잘못된 요청입니다." });
}));

// 상대 시간 계산 함수
function getRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return new Date(date).toLocaleDateString('ko-KR');
}

// 커뮤니티 페이지
app.get("/community", requireAuth, asyncHandler(async (req, res) => {
  const category = req.query.category; // 쿼리 파라미터로 카테고리 필터링
  const query = category && category !== 'all' ? { category } : {};
  const userId = req.session.userId;
  
  const posts = await CommunityPost.find(query)
    .populate("writer", "name nickname")
    .sort({ createdAt: -1 })
    .lean();
  
  // 각 게시글에 좋아요 여부 추가
  const postsWithLiked = posts.map(post => ({
    ...post,
    isLiked: post.likedBy && post.likedBy.some(id => id.toString() === userId)
  }));
  
  const user = await User.findById(userId).lean();
  const folders = user ? (user.folders || []) : [];
  
  res.render("community", {
    pageTitle: "커뮤니티",
    posts: postsWithLiked || [],
    currentCategory: category || 'all',
    folders: folders,
    getRelativeTime: getRelativeTime
  });
}));

// 커뮤니티 글 작성 페이지
app.get("/community/add", requireAuth, (req, res) => {
  res.render("community/add", {
    pageTitle: "커뮤니티 글 작성"
  });
});

// 커뮤니티 글 작성 처리
app.post("/community/add", requireAuth, asyncHandler(async (req, res) => {
  const { title, content, category } = req.body;
  const userId = req.session.userId;

  if (!title || !content || !category) {
    return res.status(400).render("community/add", {
      pageTitle: "커뮤니티 글 작성",
      error: "모든 항목을 입력해주세요.",
      formData: { title, content, category }
    });
  }

  await CommunityPost.create({
    title: title.trim(),
    content: content.trim(),
    category: category,
    writer: userId,
    likes: 0,
    comments: 0
  });

  res.redirect("/community");
}));

// 커뮤니티 글 상세 페이지
app.get("/community/:id", requireAuth, asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id)
    .populate("writer", "name nickname")
    .lean();

  if (!post) {
    return res.status(404).render("error", {
      pageTitle: "글을 찾을 수 없습니다",
      message: "요청하신 글이 존재하지 않습니다."
    });
  }

  const isOwner = post.writer && post.writer._id.toString() === req.session.userId;
  const isLiked = post.likedBy && post.likedBy.some(id => id.toString() === req.session.userId);

  // 댓글 가져오기
  const comments = await CommunityComment.find({ postId: post._id })
    .populate("writer", "name nickname")
    .sort({ createdAt: 1 })
    .lean();

  // 각 댓글에 좋아요 여부 추가
  const commentsWithLiked = comments.map(comment => ({
    ...comment,
    isLiked: comment.likedBy && comment.likedBy.some(id => id.toString() === req.session.userId)
  }));

  // 각 댓글에 작성자 여부 추가
  const commentsWithOwner = commentsWithLiked.map(comment => ({
    ...comment,
    isCommentOwner: comment.writer && comment.writer._id.toString() === req.session.userId
  }));

  // 사용자 폴더 가져오기
  const user = await User.findById(req.session.userId);
  const userFolders = user && user.folders ? user.folders : [];

  res.render("community/detail", {
    pageTitle: post.title,
    post: post,
    isOwner: isOwner,
    isLiked: isLiked,
    comments: commentsWithOwner,
    folders: userFolders,
    getRelativeTime: getRelativeTime
  });
}));

// 게시글 좋아요 토글
app.post("/community/:id/like", requireAuth, asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, message: "글을 찾을 수 없습니다." });
  }

  const userId = req.session.userId;
  const likedIndex = post.likedBy.findIndex(id => id.toString() === userId);

  if (likedIndex > -1) {
    // 좋아요 취소
    post.likedBy.splice(likedIndex, 1);
    post.likes = Math.max(0, post.likes - 1);
  } else {
    // 좋아요 추가
    post.likedBy.push(userId);
    post.likes += 1;
  }

  await post.save();
  res.json({ success: true, likes: post.likes, isLiked: likedIndex === -1 });
}));

// 댓글 작성
app.post("/community/:id/comment", requireAuth, asyncHandler(async (req, res) => {
  const { content } = req.body;
  const postId = req.params.id;
  const userId = req.session.userId;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: "댓글 내용을 입력해주세요." });
  }

  const post = await CommunityPost.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: "글을 찾을 수 없습니다." });
  }

  const comment = await CommunityComment.create({
    postId: postId,
    writer: userId,
    content: content.trim(),
    likes: 0
  });

  // 게시글 댓글 수 증가
  post.comments += 1;
  await post.save();

  // 작성자 정보와 함께 반환
  const commentWithWriter = await CommunityComment.findById(comment._id)
    .populate("writer", "name nickname")
    .lean();

  res.json({ success: true, comment: commentWithWriter, commentCount: post.comments });
}));

// 댓글 좋아요 토글
app.post("/community/comment/:commentId/like", requireAuth, asyncHandler(async (req, res) => {
  const comment = await CommunityComment.findById(req.params.commentId);
  if (!comment) {
    return res.status(404).json({ success: false, message: "댓글을 찾을 수 없습니다." });
  }

  const userId = req.session.userId;
  const likedIndex = comment.likedBy.findIndex(id => id.toString() === userId);

  if (likedIndex > -1) {
    // 좋아요 취소
    comment.likedBy.splice(likedIndex, 1);
    comment.likes = Math.max(0, comment.likes - 1);
  } else {
    // 좋아요 추가
    comment.likedBy.push(userId);
    comment.likes += 1;
  }

  await comment.save();
  res.json({ success: true, likes: comment.likes, isLiked: likedIndex === -1 });
}));

// 게시글 삭제
app.post("/community/:id", requireAuth, asyncHandler(async (req, res) => {
  if (req.body._method !== 'DELETE') {
    return res.status(400).json({ success: false, message: "잘못된 요청입니다." });
  }

  const post = await CommunityPost.findById(req.params.id);
  
  if (!post) {
    return res.status(404).json({ success: false, message: "글을 찾을 수 없습니다." });
  }

  // 본인 글인지 확인
  if (post.writer.toString() !== req.session.userId) {
    return res.status(403).json({ success: false, message: "삭제 권한이 없습니다." });
  }

  // 관련 댓글도 모두 삭제
  await CommunityComment.deleteMany({ postId: post._id });
  
  // 게시글 삭제
  await CommunityPost.findByIdAndDelete(req.params.id);

  res.json({ success: true });
}));

// 댓글 수정 및 삭제
app.post("/community/comment/:commentId", requireAuth, asyncHandler(async (req, res) => {
  const method = req.body._method || req.query._method;
  const comment = await CommunityComment.findById(req.params.commentId);
  
  if (!comment) {
    return res.status(404).json({ success: false, message: "댓글을 찾을 수 없습니다." });
  }

  // 본인 댓글인지 확인
  if (comment.writer.toString() !== req.session.userId) {
    return res.status(403).json({ success: false, message: "권한이 없습니다." });
  }

  if (method === 'PUT') {
    // 댓글 수정
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "댓글 내용을 입력해주세요." });
    }

    comment.content = content.trim();
    await comment.save();

    res.json({ success: true, comment: comment });
  } else if (method === 'DELETE') {
    // 댓글 삭제
    const post = await CommunityPost.findById(comment.postId);
    if (post) {
      post.comments = Math.max(0, post.comments - 1);
      await post.save();
    }

    await CommunityComment.findByIdAndDelete(req.params.commentId);
    res.json({ success: true });
  } else {
    return res.status(400).json({ success: false, message: "잘못된 요청입니다." });
  }
}));

// 커뮤니티 글 수정 페이지
app.get("/community/:id/edit", requireAuth, asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id).lean();

  if (!post) {
    return res.status(404).redirect("/community");
  }

  // 본인 글인지 확인
  if (post.writer.toString() !== req.session.userId) {
    return res.status(403).redirect(`/community/${req.params.id}`);
  }

  res.render("community/edit", {
    pageTitle: "커뮤니티 글 수정",
    post: post
  });
}));

// 커뮤니티 글 수정 처리
app.post("/community/:id/edit", requireAuth, asyncHandler(async (req, res) => {
  const { title, content, category } = req.body;
  const postId = req.params.id;

  const post = await CommunityPost.findById(postId);

  if (!post) {
    return res.status(404).redirect("/community");
  }

  // 본인 글인지 확인
  if (post.writer.toString() !== req.session.userId) {
    return res.status(403).redirect(`/community/${postId}`);
  }

  if (!title || !content || !category) {
    return res.status(400).render("community/edit", {
      pageTitle: "커뮤니티 글 수정",
      post: post,
      error: "모든 항목을 입력해주세요."
    });
  }

  post.title = title.trim();
  post.content = content.trim();
  post.category = category;
  await post.save();

  res.redirect(`/community/${postId}`);
}));

app.use("/users", requireAuth, userRoutes);

// 폴더 생성
app.post("/folders", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: "폴더 이름을 입력해주세요." });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다." });
  }

  // 중복 폴더 이름 확인
  const existingFolder = user.folders.find(f => f.name.trim() === name.trim());
  if (existingFolder) {
    return res.status(400).json({ success: false, message: "이미 같은 이름의 폴더가 있습니다." });
  }

  user.folders.push({
    name: name.trim(),
    posts: [],
    createdAt: new Date()
  });

  await user.save();

  // 저장 후 다시 조회하여 제대로 직렬화된 폴더 가져오기
  const updatedUser = await User.findById(userId);
  const newFolder = updatedUser.folders[updatedUser.folders.length - 1];
  res.json({ success: true, folder: newFolder.toObject() });
}));

// 폴더 이름 수정
app.put("/folders/:folderId", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { folderId } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: "폴더 이름을 입력해주세요." });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다." });
  }

  const folder = user.folders.id(folderId);
  if (!folder) {
    return res.status(404).json({ success: false, message: "폴더를 찾을 수 없습니다." });
  }

  // 중복 폴더 이름 확인 (현재 폴더 제외)
  const existingFolder = user.folders.find(f => f._id.toString() !== folderId && f.name.trim() === name.trim());
  if (existingFolder) {
    return res.status(400).json({ success: false, message: "이미 같은 이름의 폴더가 있습니다." });
  }

  folder.name = name.trim();
  await user.save();

  // 저장 후 다시 조회하여 업데이트된 폴더 가져오기
  const updatedUser = await User.findById(userId);
  const updatedFolder = updatedUser.folders.id(folderId);
  res.json({ success: true, folder: updatedFolder.toObject() });
}));

// 폴더 삭제
app.delete("/folders/:folderId", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { folderId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다." });
  }

  const folder = user.folders.id(folderId);
  if (!folder) {
    return res.status(404).json({ success: false, message: "폴더를 찾을 수 없습니다." });
  }

  // Mongoose subdocument 삭제
  user.folders.pull(folderId);
  await user.save();

  res.json({ success: true, message: "폴더가 삭제되었습니다." });
}));

// 폴더에 글 추가
app.post("/folders/:folderId/posts", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { folderId } = req.params;
  const { postId, postType } = req.body;

  if (!postId || !postType) {
    return res.status(400).json({ success: false, message: "글 정보가 필요합니다." });
  }

  if (!['recruit', 'seeking', 'community'].includes(postType)) {
    return res.status(400).json({ success: false, message: "올바른 글 타입이 아닙니다." });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다." });
  }

  const folder = user.folders.id(folderId);
  if (!folder) {
    return res.status(404).json({ success: false, message: "폴더를 찾을 수 없습니다." });
  }

  // postId를 ObjectId로 변환
  const postObjectId = mongoose.Types.ObjectId.isValid(postId) 
    ? new mongoose.Types.ObjectId(postId) 
    : postId;

  // 이미 폴더에 있는지 확인
  const existingPost = folder.posts.find(p => p.postId.toString() === postObjectId.toString() && p.postType === postType);
  if (existingPost) {
    return res.status(400).json({ success: false, message: "이미 폴더에 추가된 글입니다." });
  }

  // 스크랩한 글인지 또는 좋아요한 글인지 확인
  let canAdd = false;
  if (postType === 'recruit') {
    const post = await RecruitmentPost.findById(postObjectId);
    if (post && post.scrappedBy && post.scrappedBy.some(id => id.toString() === userId)) {
      canAdd = true;
    }
  } else if (postType === 'seeking') {
    const post = await TeamSeekingPost.findById(postObjectId);
    if (post && post.scrappedBy && post.scrappedBy.some(id => id.toString() === userId)) {
      canAdd = true;
    }
  } else if (postType === 'community') {
    const post = await CommunityPost.findById(postObjectId);
    if (post && post.likedBy && post.likedBy.some(id => id.toString() === userId)) {
      canAdd = true;
    }
  }

  if (!canAdd) {
    return res.status(400).json({ success: false, message: postType === 'community' ? "좋아요한 글만 폴더에 추가할 수 있습니다." : "스크랩한 글만 폴더에 추가할 수 있습니다." });
  }

  folder.posts.push({
    postId: postObjectId,
    postType,
    addedAt: new Date()
  });

  await user.save();

  // 저장 후 다시 조회하여 업데이트된 폴더 가져오기
  const updatedUser = await User.findById(userId);
  const updatedFolder = updatedUser.folders.id(folderId);
  res.json({ success: true, folder: updatedFolder.toObject() });
}));

// 폴더에서 글 제거
app.delete("/folders/:folderId/posts/:postId", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { folderId, postId } = req.params;
  const { postType } = req.query;

  if (!postType) {
    return res.status(400).json({ success: false, message: "글 타입이 필요합니다." });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다." });
  }

  const folder = user.folders.id(folderId);
  if (!folder) {
    return res.status(404).json({ success: false, message: "폴더를 찾을 수 없습니다." });
  }

  const postIndex = folder.posts.findIndex(p => p.postId.toString() === postId && p.postType === postType);
  if (postIndex === -1) {
    return res.status(404).json({ success: false, message: "폴더에서 글을 찾을 수 없습니다." });
  }

  folder.posts.splice(postIndex, 1);
  await user.save();

  // 저장 후 다시 조회하여 업데이트된 폴더 가져오기
  const updatedUser = await User.findById(userId);
  const updatedFolder = updatedUser.folders.id(folderId);
  res.json({ success: true, folder: updatedFolder.toObject() });
}));

// 폴더별 글 보기
app.get("/folders/:folderId", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { folderId } = req.params;

  const user = await User.findById(userId).lean();
  if (!user) {
    return res.status(404).render("error", {
      pageTitle: "Linker",
      message: "사용자를 찾을 수 없습니다."
    });
  }

  const folder = user.folders.find(f => f._id.toString() === folderId);
  if (!folder) {
    return res.status(404).render("error", {
      pageTitle: "Linker",
      message: "폴더를 찾을 수 없습니다."
    });
  }

  // 폴더에 있는 글들 가져오기
  const recruitPostIds = folder.posts.filter(p => p.postType === 'recruit').map(p => p.postId);
  const seekingPostIds = folder.posts.filter(p => p.postType === 'seeking').map(p => p.postId);
  const communityPostIds = folder.posts.filter(p => p.postType === 'community').map(p => p.postId);

  const [recruitPosts, seekingPosts, communityPosts] = await Promise.all([
    recruitPostIds.length > 0 ? RecruitmentPost.find({ _id: { $in: recruitPostIds } })
      .populate("writer", "name nickname")
      .lean() : [],
    seekingPostIds.length > 0 ? TeamSeekingPost.find({ _id: { $in: seekingPostIds } })
      .populate("writer", "name nickname")
      .lean() : [],
    communityPostIds.length > 0 ? CommunityPost.find({ _id: { $in: communityPostIds } })
      .populate("writer", "name nickname")
      .lean() : []
  ]);

  // 원래 순서 유지
  const allPosts = folder.posts.map(folderPost => {
    if (folderPost.postType === 'recruit') {
      return recruitPosts.find(p => p._id.toString() === folderPost.postId.toString());
    } else if (folderPost.postType === 'seeking') {
      return seekingPosts.find(p => p._id.toString() === folderPost.postId.toString());
    } else if (folderPost.postType === 'community') {
      return communityPosts.find(p => p._id.toString() === folderPost.postId.toString());
    }
    return null;
  }).filter(Boolean).map(post => {
    const folderPost = folder.posts.find(p => 
      p.postId.toString() === post._id.toString()
    );
    
    let postType = folderPost.postType;
    if (!postType) {
      // postType이 없으면 글의 특성으로 판단
      postType = post.deadline ? 'recruit' : (post.category ? 'seeking' : 'community');
    }
    
    return {
      ...post,
      postType: postType,
      isScrapped: postType !== 'community',
      isLiked: postType === 'community'
    };
  });

  res.render("folders/detail", {
    pageTitle: folder.name,
    folder: folder,
    posts: allPosts,
    getRelativeTime: getRelativeTime
  });
}));

app.get("/test", (req, res, next) => {
  const error = new Error("테스트용 에러"); // 오류 생성
  error.status = 404;
  next(error); // 다음 미들웨어로 넘김
});

app.use(errorhandler);

app.listen(port, () => {
  console.log(`${port}번 포트에서 서버 실행 중`);
});
