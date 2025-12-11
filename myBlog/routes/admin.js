const express = require("express");
const router = express.Router();
const adminLayout = "../views/layouts/admin"; //레이아웃 가져오기
const adminLayout2 = "../views/layouts/admin-nologout";
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Post = require("../models/Post");
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;

/**
 * Check Login
 */

const checkLogin = (req, res, next) => {
    const token = req.cookies.token; // 쿠키 정보 가져오기

    // 토큰이 없다면
    if (!token) {
        res.redirect("/admin");
    }

    // 토큰이 있다면 토큰을 확인하고 사용자 정보를 요청에 추가하기
    
    try {
        const decoded = jwt.verify(token, jwtSecret); // 토큰 해석하기
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.redirect("/admin");
    }
};

/**
 * GET /admin
 * Admin page
 */
router.get("/admin", (req, res) => {
    // res.send("Admin page");
    const locals = {
        title: "관리자 페이지", // 브라우저 탭에 표시할 내용
    };

    // admin Layout을 사용해서 admin/index.ejs 렌더링하기
    res.render("admin/index", { locals, layout: adminLayout2 })
});

/**
 * POST /admin
 * Check admin login
 */

router.post(
    "/admin",
    asyncHandler(async (req, res) => {
        const { username, password } = req.body;

        // if (username === "admin" && password === "admin") {
        //     res.send("Success");
        // } else {
        //     res.send("Fail");
        // }

        // 사용자 이름으로 사용자 찾기
        const user = await User.findOne({ username });

        // 일치하는 사용자가 없으면 401 오류 표시
        if (!user) {
            return res.status(401).json({ message: "일치하는 사용자가 없습니다."});
        }

        // 입력한 비밀번호와 DB에 저장된 비밀번호 비교
        const isValidPassword = await bcrypt.compare(password, user.password);

        // 비밀번호가 일치하지 않으면 401 오류 표시
        if (!isValidPassword) {
            return res.status(401).json({ message: "비밀번호가 일치하지 않습니다."});
        }

        //JWT 토큰 생성
        const token = jwt.sign({ id: user._id }, jwtSecret);

        // 토큰을 쿠키에 저장
        res.cookie("token", token, { httpOnly: true });

        // 로그인에 성공하면 전체 게시물 목록 페이지로 이동
        res.redirect("/allPosts");
    })
);

// /**
//  * GET /register
//  * Register administator
//  */

// router.get(
//     "/register", asyncHandler(async (req, res) => {
//         res.render("admin/index", { layout: adminLayout2 });
//     })
// );

// router.post(
//     "/register",
//     asyncHandler(async (req, res) => {
//         const hashedPassword = await bcrypt.hash(req.body.password, 10); // 비밀번호 암호화
//         const user = await User.create({
//             username: req.body.username,
//             password: hashedPassword, // 암호화된 비밀번호
//         });
//         res.json(`user created: ${user}`); // 성공하면 메시지 출력
//     })
// );

/**
 * GET /allPosts
 * Get all posts
 */

router.get(
    "/allPosts",
    checkLogin,
    asyncHandler(async (req, res) => {
        const locals = {
            title: "전체 게시물",
        };
        const data = await Post.find(); // 전체 게시물 가져오기
        res.render("admin/allPosts", { 
            locals,
            data,
            layout: adminLayout,
        });
    })
);

router.get(
    "/add",
    checkLogin,
    asyncHandler(async (req, res) => {
        const locals = {
            title: "게시물 작성",
        };
        res.render("admin/add", {
            locals,
            layout: adminLayout,
        });
    })
);

router.post(
    "/add",
    checkLogin,
    asyncHandler(async (req, res) => {
        const { title, body } = req.body;

        const newPost = new Post({
            title: title,
            body: body,
        });

        await Post.create(newPost);

        res.redirect("/allPosts");
    })
);

router.get(
    "/edit/:id",
    checkLogin,
    asyncHandler(async(req, res) => {
        const locals = {
            title: "게시물 편집",
        };

        // id값을 사용해서 게시물 가져오기
        const data = await Post.findOne({ _id: req.params.id });
        res.render("admin/edit", {
            locals,
            data,
            layout: adminLayout,
        });
    })
);

router.put(
    "/edit/:id",
    checkLogin,
    asyncHandler(async (req, res) => {
        await Post.findByIdAndUpdate(req.params.id, {
            title: req.body.title,
            body: req.body.body,
            createAt: Date.now(),
        });
        // 수정한 후 전체 목록 다시 표시하기
        res.redirect("/allPosts");
    })
);

router.delete(
    "/delete/:id",
    checkLogin,
    asyncHandler(async (req, res) => {
        await Post.deleteOne({ _id: req.params.id });
        res.redirect("/allPosts");
    })
);

// 로그아웃 라우트 정의 (GET /admin/logout으로 들어오는 요청 처리)
router.get("/logout", (req, res) => { 
  res.clearCookie("token"); // 브라우저에 저장되어 있던 'token' 쿠키를 삭제해서 로그인 상태를 해제하는 줄
  res.redirect("/admin"); // 로그아웃 후 /admin 로그인 페이지로 다시 보내고, 이 함수 실행을 여기서 끝내는 줄
});


module.exports = router;