import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

const MemberSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      unique: true,
      index: true
    },
    leaderId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    department: String,
    shiftType: {
      type: String,
      enum: ['day', 'night'],
      required: true
    },
    createdBy: String,
    updatedBy: String
  },
  {
    timestamps: true
  }
);

MemberSchema.pre('validate', function (next) {
  if (!this.memberId) {
    this.memberId = `member_${nanoid(6)}`;
  }
  next();
});

const Member = mongoose.model('Member', MemberSchema);

export default Member;

