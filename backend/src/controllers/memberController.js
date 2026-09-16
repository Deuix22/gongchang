import Member from '../models/Member.js';
import User from '../models/User.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';

async function ensurePermission (req, leaderId) {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return;
  }
  if (leaderId !== req.user.userId) {
    throw forbidden('无权操作其他组的成员');
  }
}

export async function listMembers (req, res) {
  const { leaderId } = req.params;
  await ensurePermission(req, leaderId);
  const members = await Member.find({ leaderId }).sort({ createdAt: -1 });
  res.json(
    members.map(member => ({
      memberId: member.memberId,
      name: member.name,
      shiftType: member.shiftType,
      createdAt: member.createdAt
    }))
  );
}

export async function createMember (req, res) {
  const { leaderId } = req.params;
  await ensurePermission(req, leaderId);

  const { name, shiftType } = req.body ?? {};
  if (!name || !shiftType) {
    throw badRequest('name 与 shiftType 必填');
  }

  if (!['day', 'night'].includes(shiftType)) {
    throw badRequest('shiftType 必须为 day 或 night');
  }

  const leader = await User.findOne({ userId: leaderId });
  if (!leader) {
    throw notFound('组长不存在');
  }

  const member = await Member.create({
    leaderId,
    name,
    shiftType,
    department: leader.department,
    createdBy: req.user.userId
  });

  res.status(201).json({
    memberId: member.memberId,
    leaderId,
    name: member.name,
    shiftType: member.shiftType,
    createdAt: member.createdAt
  });
}

export async function updateMember (req, res) {
  const { leaderId, memberId } = req.params;
  await ensurePermission(req, leaderId);

  const { name, shiftType } = req.body ?? {};
  if (!name && !shiftType) {
    throw badRequest('至少提供一个修改字段');
  }

  const member = await Member.findOne({ leaderId, memberId });
  if (!member) {
    throw notFound('组员不存在');
  }

  if (name) member.name = name;
  if (shiftType) {
    if (!['day', 'night'].includes(shiftType)) {
      throw badRequest('shiftType 必须为 day 或 night');
    }
    member.shiftType = shiftType;
  }
  member.updatedBy = req.user.userId;
  await member.save();

  res.json({
    memberId: member.memberId,
    name: member.name,
    shiftType: member.shiftType,
    updatedAt: member.updatedAt
  });
}

export async function deleteMember (req, res) {
  const { leaderId, memberId } = req.params;
  await ensurePermission(req, leaderId);

  const member = await Member.findOne({ leaderId, memberId });
  if (!member) {
    throw notFound('组员不存在');
  }

  await member.deleteOne();

  res.json({ success: true });
}

