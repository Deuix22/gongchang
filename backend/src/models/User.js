import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

const UserSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
      index: true
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      minlength: 3
    },
    passwordHash: {
      type: String,
      select: false // 默认查询时不返回密码哈希
    },
    nickName: {
      type: String,
      required: true
    },
    avatarUrl: String,
    role: {
      type: String,
      enum: ['leader', 'manager', 'admin'],
      default: 'leader'
    },
    department: {
      type: String
    },
    wechatOpenId: {
      type: String,
      unique: true,
      sparse: true
    },
    wechatUnionId: {
      type: String,
      unique: true,
      sparse: true
    },
    wechatAuthExpired: {
      type: Boolean,
      default: false
    },
    authExpiredAt: {
      type: Date
    },
    refreshTokens: [
      {
        token: String,
        expiresAt: Date,
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    lastLoginAt: Date
  },
  {
    timestamps: true
  }
);

UserSchema.pre('validate', function (next) {
  if (!this.userId) {
    const prefix = this.role ?? 'leader';
    this.userId = `${prefix}_${nanoid(6)}`;
  }
  next();
});

const User = mongoose.model('User', UserSchema);

export default User;

