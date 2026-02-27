@echo off
chcp 65001 >nul
echo 🚀 正在启动简历定制 Agent...

if not defined ANTHROPIC_API_KEY (
  echo ⚠️  未设置 ANTHROPIC_API_KEY，可在启动后于界面中配置。
)

echo 📦 安装后端依赖...
cd backend
pip install -r requirements.txt -q
cd ..

echo 🌐 先构建前端（后端需要 frontend\dist 才能显示页面）...
cd frontend
call npm install --silent
call npm run build
cd ..

echo 🔧 启动后端，请用浏览器打开: http://localhost:8000
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
