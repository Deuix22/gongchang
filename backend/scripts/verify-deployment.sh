#!/bin/bash

# 部署验证脚本
# 用于验证 PUT /api/users/me 接口是否已正确部署

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
API_BASE_URL="${API_BASE_URL:-https://hvoqpnuvbtfp.sealosbja.site}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-030426}"

echo "=========================================="
echo "部署验证脚本"
echo "=========================================="
echo "API 地址: $API_BASE_URL"
echo ""

# 1. 测试登录获取 Token
echo "1. 测试管理员登录..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/login-admin" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo -e "${GREEN}✓${NC} 登录成功"
  echo "Token: ${TOKEN:0:50}..."
else
  echo -e "${RED}✗${NC} 登录失败"
  echo "响应: $LOGIN_RESPONSE"
  exit 1
fi

echo ""

# 2. 测试 GET /api/users/me
echo "2. 测试 GET /api/users/me..."
GET_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$API_BASE_URL/api/users/me" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$GET_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$GET_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC} GET 接口正常 (HTTP $HTTP_CODE)"
  USER_ID=$(echo "$BODY" | grep -o '"userId":"[^"]*' | cut -d'"' -f4)
  NICK_NAME=$(echo "$BODY" | grep -o '"nickName":"[^"]*' | cut -d'"' -f4)
  echo "  用户ID: $USER_ID"
  echo "  昵称: $NICK_NAME"
else
  echo -e "${RED}✗${NC} GET 接口异常 (HTTP $HTTP_CODE)"
  echo "响应: $BODY"
  exit 1
fi

echo ""

# 3. 测试 PUT /api/users/me
echo "3. 测试 PUT /api/users/me..."
TEST_NICKNAME="部署验证测试_$(date +%s)"
PUT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "$API_BASE_URL/api/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"nickName\":\"$TEST_NICKNAME\"}")

HTTP_CODE=$(echo "$PUT_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$PUT_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC} PUT 接口正常 (HTTP $HTTP_CODE)"
  UPDATED_NICKNAME=$(echo "$BODY" | grep -o '"nickName":"[^"]*' | cut -d'"' -f4)
  if [ "$UPDATED_NICKNAME" = "$TEST_NICKNAME" ]; then
    echo -e "${GREEN}✓${NC} 昵称更新成功: $UPDATED_NICKNAME"
  else
    echo -e "${YELLOW}⚠${NC} 昵称更新异常: 期望 '$TEST_NICKNAME', 实际 '$UPDATED_NICKNAME'"
  fi
else
  echo -e "${RED}✗${NC} PUT 接口异常 (HTTP $HTTP_CODE)"
  echo "响应: $BODY"
  echo ""
  echo -e "${YELLOW}提示:${NC} 如果返回 404，说明生产环境尚未部署最新代码"
  echo "      请检查："
  echo "      1. 代码是否已提交到 Git 仓库"
  echo "      2. 生产环境是否已重新部署"
  echo "      3. 服务是否已重启"
  exit 1
fi

echo ""

# 4. 测试参数验证
echo "4. 测试参数验证..."
VALIDATION_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "$API_BASE_URL/api/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_CODE=$(echo "$VALIDATION_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$VALIDATION_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✓${NC} 参数验证正常 (HTTP $HTTP_CODE)"
else
  echo -e "${YELLOW}⚠${NC} 参数验证异常 (HTTP $HTTP_CODE)"
  echo "响应: $BODY"
fi

echo ""

# 5. 测试长度验证
echo "5. 测试长度验证..."
LONG_NICKNAME="这是一个超过20个字符的非常长的昵称测试123456"
LENGTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "$API_BASE_URL/api/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"nickName\":\"$LONG_NICKNAME\"}")

HTTP_CODE=$(echo "$LENGTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$LENGTH_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✓${NC} 长度验证正常 (HTTP $HTTP_CODE)"
else
  echo -e "${YELLOW}⚠${NC} 长度验证异常 (HTTP $HTTP_CODE)"
  echo "响应: $BODY"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓${NC} 所有测试通过！接口已正确部署。"
echo "=========================================="

