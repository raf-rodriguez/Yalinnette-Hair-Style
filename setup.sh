#!/bin/bash
echo "🌸 Configurando Yalinnette Hair & Beauty Artist App..."

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py makemigrations citas
python manage.py migrate
echo "✅ Backend configurado"

# Frontend
cd ../frontend
npm install
cp .env.example .env.local
echo "✅ Frontend configurado"

echo ""
echo "🚀 Para iniciar la app:"
echo "   Terminal 1: cd backend && source venv/bin/activate && python manage.py runserver"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "📍 URLs:"
echo "   Sitio Web: http://localhost:3000"
echo "   Admin:     http://localhost:3000/admin"
echo "   API:       http://localhost:8000/api/"
