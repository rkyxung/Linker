const UserDescription = require('../models/userDescriptionModel');
const User = require('../models/userModel');

// 프로필 정보 업데이트 (닉네임 + 프로필 정보)
exports.updateUserDescription = async (req, res) => {
  try {
    const { nickname, role, school, bio } = req.body;
    const userId = req.session.userId; // session에서 userId를 가져옵니다

    if (!userId) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    // 닉네임 업데이트 및 세션 업데이트
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { nickname },
      { new: true }
    );
    
    if (updatedUser) {
      req.session.nickname = nickname;
    }

    // UserDescription 업데이트 또는 생성
    const userDesc = await UserDescription.findOneAndUpdate(
      { userId },
      { role, school, bio },
      { upsert: true, new: true }
    );

    res.redirect('/profile');
  } catch (error) {
    console.error('프로필 정보 업데이트 에러:', error);
    res.status(500).json({ message: '프로필 정보 업데이트 중 오류가 발생했습니다.' });
  }
};

// 프로필 정보 조회
exports.getUserDescription = async (req, res) => {
  try {
    const userId = req.user.id;
    const userDesc = await UserDescription.findOne({ userId });
    return userDesc;
  } catch (error) {
    console.error('프로필 정보 조회 에러:', error);
    return null;
  }
};