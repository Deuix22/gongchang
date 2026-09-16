import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://root:6n2825zx@test-db-mongodb.ns-o9xuidp4.svc:27017/attendance?authSource=admin';

async function testConnection() {
  try {
    console.log('正在连接数据库...');
    console.log('连接字符串:', MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // 隐藏密码
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    
    console.log('✅ 数据库连接成功！');
    
    // 测试基本操作
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`✅ 数据库包含 ${collections.length} 个集合`);
    
    // 检查 users 集合
    const usersCount = await db.collection('users').countDocuments();
    console.log(`✅ users 集合包含 ${usersCount} 个文档`);
    
    // 执行 ping 命令
    const pingResult = await db.admin().ping();
    console.log('✅ 数据库 ping 结果:', pingResult);
    
    // 获取服务器状态
    const serverStatus = await db.admin().serverStatus();
    console.log('✅ 数据库版本:', serverStatus.version);
    console.log('✅ 运行时长:', Math.floor(serverStatus.uptime / 3600), '小时');
    
    await mongoose.connection.close();
    console.log('✅ 连接已关闭');
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库连接失败:');
    console.error('错误类型:', error.name);
    console.error('错误消息:', error.message);
    if (error.reason) {
      console.error('原因:', error.reason);
    }
    process.exit(1);
  }
}

testConnection();

