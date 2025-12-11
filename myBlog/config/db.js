const mongoose = require("mongoose");
const asynchandler = require("express-async-handler");
require("dotenv").config(); // .env 파일을 사용하기 위해

const connectDb = asynchandler(async() => {
    // .env 파일에 있는 MONGODB_URI값을 사용해 접속
    const connect = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`DB connected: ${connect.connection.host}`); // DB 연결 성공 시 터미널에 출력
});

module.exports = connectDb;