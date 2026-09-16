import User from '../models/User.js';
import Member from '../models/Member.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';

export async function updateLeaderDepartment (req, res) {
  const { leaderId } = req.params;
  if (leaderId !== req.user.userId && req.user.role !== 'admin') {
    throw forbidden('无法修改其他用户的部门');
  }

  const { department } = req.body ?? {};
  if (!department) {
    throw badRequest('department 必填');
  }

  const leader = await User.findOne({ userId: leaderId });
  if (!leader) {
    throw notFound('组长不存在');
  }

  leader.department = department;
  await leader.save();

  res.json({
    leaderId: leader.userId,
    department: leader.department
  });
}

export async function removeLeaderDepartment (req, res) {
  const { leaderId } = req.params;
  if (leaderId !== req.user.userId && req.user.role !== 'admin') {
    throw forbidden('无法取消其他用户的部门');
  }

  const leader = await User.findOne({ userId: leaderId });
  if (!leader) {
    throw notFound('组长不存在');
  }

  leader.department = undefined;
  await leader.save();

  res.json({ success: true });
}

export async function getAllLeaders (req, res) {
  const includeMembers = String(req.query.includeMembers ?? 'false').toLowerCase() === 'true';

  const leaders = await User.find({ role: 'leader' }).sort({ department: 1, createdAt: 1 });

  const grouped = new Map();
  leaders.forEach(leader => {
    const dept = leader.department ?? '未分配';
    if (!grouped.has(dept)) {
      grouped.set(dept, []);
    }
    grouped.get(dept).push(leader);
  });

  const response = [];
  for (const [department, leaderList] of grouped.entries()) {
    leaderList.forEach((leader, index) => {
      const entry = {
        leaderId: leader.userId,
        nickName: leader.nickName,
        department: department === '未分配' ? null : department,
        groupIndex: index + 1
      };
      if (includeMembers) {
        entry.members = [];
      }
      response.push(entry);
    });
  }

  if (includeMembers) {
    const leaderIds = leaders.map(l => l.userId);
    const members = await Member.find({ leaderId: { $in: leaderIds } });
    const memberMap = new Map();

    response.forEach(item => memberMap.set(item.leaderId, item));

    members.forEach(member => {
      if (memberMap.has(member.leaderId)) {
        memberMap.get(member.leaderId).members.push({
          memberId: member.memberId,
          name: member.name,
          shiftType: member.shiftType
        });
      }
    });
  }

  res.json(response);
}

