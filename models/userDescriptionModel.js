const mongoose = require('mongoose');

const userDescriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  role: {
    type: String,
    trim: true
  },
  school: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

const UserDescription = mongoose.model('UserDescription', userDescriptionSchema);

module.exports = UserDescription;