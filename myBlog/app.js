// .env에 있는 변수 가져오기
require("dotenv").config();
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const connectDb = require("./config/db");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");

const app = express();
// .env에 PORT가 없으면 3000번 포트 사용
const port = process.env.PORT || 3000;

// DB 연결
connectDb();

// app.get("/", (req, res) => {
//     res.send("Hello World!");
// });

//레이아웃과 뷰 엔진 설정
app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", "./views");
app.set("layout", "layouts/main");

// 정적 파일
app.use(express.static("public"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(methodOverride("_method"));

app.use(cookieParser());

// 루트(/) 경로로 접속하면 routes\main.js의 라우트 사용
app.use("/", require("./routes/main"));
app.use("/", require("./routes/admin"));

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});