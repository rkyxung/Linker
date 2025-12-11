const express = require("express");
const router = express.Router();
const mainLayout = "../views/layouts/main.ejs";
const asyncHandler = require("express-async-handler");
const Post = require("../models/Post");

// // 루트 경로 핸들러
// router.get("/", (req, res) => {
//     res.send("메인 페이지입니다!");
// });


router.get(["/", "/home"], asyncHandler(async (req, res) => {
    const locals = {
        title: "Home",
    }
    const data = await Post.find({});
    res.render("index", {locals, data, layout:mainLayout});
})
);

router.get(
    "/post/:id",
    asyncHandler(async (req, res) => {
        const data = await Post.findOne({_id: req.params.id});
        res.render("post", { data, layout: mainLayout });
    })
)
    

router.get("/about", (req, res) => {
    // about.ejs를 렌더링하는데 mainLayout 레이아웃으로 감싸기
    res.render("about", { layout: mainLayout });
});

router.get("/contact", (req, res) => {
    res.render("contact", { layout: mainLayout });
})

// // 임시 데이터 저장하기
// Post.insertMany([
//     {
//         title: "22461010",
//         body: "저는 계원예술대학교를 재학 중인 김가영입니다",
//     },
//     {
//         title: "제목 2",
//         body: "내용 2 - Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, voluptatum.",
//     },
//     {
//         title: "제목 3",
//         body: "내용 3 - Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, voluptatum.",
//     },
//     {
//         title: "제목 4",
//         body: "내용 4 - Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, voluptatum.",
//     },
//     {
//         title: "제목 5",
//         body: "내용 5 - Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, voluptatum.",
//     },
// ]);


module.exports = router;