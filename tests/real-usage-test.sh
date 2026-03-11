#!/bin/bash
# AI-Writer 实际使用测试

API_KEY=$(node -e "const AuthMiddleware = require('./lib/AuthMiddleware'); const auth = new AuthMiddleware(); console.log(auth.keys.keys[0]?.key || '')" 2>/dev/null)

echo "╔════════════════════════════════════════════════════════╗"
echo "║          AI-Writer 实际使用测试                         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 测试用例
declare -a TESTS=(
  "小红书文案生成:xiaohongshu:stone:今天完成了 AI-Writer v0.6.0 开发"
  "公众号文章生成:wechat:zhoumo:AI 工具如何提升个人效率"
  "WordPress 博客生成:wordpress:yueyu:技术团队如何管理 AI Agent"
  "抖音脚本生成:douyin:dayu:3 个 AI 工具让你效率翻倍"
  "微博文案生成:weibo:dayang:今日工作总结：AI-Writer 升级完成"
)

TOTAL=0
SUCCESS=0
FAILED=0
TOTAL_SCORE=0
TOTAL_DURATION=0

for test in "${TESTS[@]}"; do
  IFS=':' read -r name platform info source <<< "$test"
  
  TOTAL=$((TOTAL + 1))
  echo ""
  echo "📝 测试：$name"
  
  START_TIME=$(date +%s%3N)
  
  RESPONSE=$(curl -s -X POST http://localhost:18062/api/v1/generate \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "{\"source\": \"$source\", \"platform\": \"$platform\", \"info\": \"$info\", \"checkFeedback\": true}")
  
  END_TIME=$(date +%s%3N)
  DURATION=$((END_TIME - START_TIME))
  
  SUCCESS_CHECK=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)
  
  if [ "$SUCCESS_CHECK" = "True" ]; then
    SUCCESS=$((SUCCESS + 1))
    SCORE=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('quality',{}).get('score', 0))" 2>/dev/null)
    TITLE=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('draft',{}).get('title', 'N/A')[:50])" 2>/dev/null)
    
    TOTAL_SCORE=$((TOTAL_SCORE + SCORE))
    TOTAL_DURATION=$((TOTAL_DURATION + DURATION))
    
    echo "   ✅ 成功 (${DURATION}ms)"
    echo "   标题：$TITLE"
    echo "   质量：$SCORE 分"
  else
    FAILED=$((FAILED + 1))
    ERROR=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error', {}).get('message', 'Unknown'))" 2>/dev/null)
    echo "   ❌ 失败：$ERROR"
  fi
done

# 计算平均值
if [ $SUCCESS -gt 0 ]; then
  AVG_SCORE=$((TOTAL_SCORE / SUCCESS))
  AVG_DURATION=$((TOTAL_DURATION / SUCCESS))
else
  AVG_SCORE=0
  AVG_DURATION=0
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "📊 测试报告"
echo "═══════════════════════════════════════════════════════"
echo "总测试：$TOTAL"
echo "✅ 成功：$SUCCESS"
echo "❌ 失败：$FAILED"
echo "平均质量：$AVG_SCORE 分"
echo "平均耗时：$AVG_DURATION ms"
echo "═══════════════════════════════════════════════════════"
