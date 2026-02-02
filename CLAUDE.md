# NFL EPA & Win Probability Calculator

## 📋 Project Overview
Full-stack application for calculating Expected Points Added (EPA) and Win Probability for NFL game situations using XGBoost machine learning models.

## 🌐 Live Deployments
- **Frontend**: https://nfl-epa-calculator.vercel.app/
- **Backend API**: https://nfl-epa-api.onrender.com/
- **API Docs**: https://nfl-epa-api.onrender.com/docs
- **GitHub**: https://github.com/johnrbeaumont/nfl-epa-calculator

## 🏗️ Architecture

### Frontend (`/frontend`)
- **Tech**: React + Vite + Tailwind CSS
- **Dev**: `npm run dev` (runs on http://localhost:3000)
- **Build**: `npm run build`
- **Deployed**: Vercel (auto-deploys on push to main)

### Backend (`/backend`)
- **Tech**: FastAPI + XGBoost + scikit-learn
- **Dev**: `uvicorn app.main:app --reload` (runs on http://localhost:8000)
- **Deployed**: Render (auto-deploys on push to main)

### Models (`/models`)
- `epa_model_xgboost.joblib` - EPA prediction model (892KB)
- `win_probability_model_xgboost.joblib` - Win probability classifier (804KB)
- Training data: 2016-2024 NFL seasons (285K+ plays)

### Data (`/data`)
- Large parquet files (gitignored)
- Source: nflfastR play-by-play data

### Notebooks (`/notebooks`)
1. `01_data_exploration.ipynb` - Initial EDA
2. `02_build_epa_model.ipynb` - EPA model training
3. `03_build_win_probability_model.ipynb` - Win probability model training

## 🚀 Quick Commands

### Development
```bash
# Start backend
cd backend && uvicorn app.main:app --reload

# Start frontend
cd frontend && npm run dev

# Test backend
python backend/test_both_apis.py
```

### Deployment
```bash
# Push to GitHub (triggers auto-deploy)
git add .
git commit -m "Your message"
git push

# Render and Vercel will auto-deploy
```

### Model Training
```bash
# Re-train models (if updating with new data)
jupyter notebook notebooks/02_build_epa_model.ipynb
jupyter notebook notebooks/03_build_win_probability_model.ipynb
```

## 📊 Model Performance

### EPA Model
- MAE: 0.228
- RMSE: 0.339
- R²: 0.962
- Training samples: 285,657

### Win Probability Model
- Brier Score: 0.180
- AUC-ROC: 0.801
- Accuracy: 71.7%
- Training samples: 203,877

## 🎨 Design System
See `DESIGN_SYSTEM.md` for comprehensive design token documentation.

Key features:
- Colorblind-friendly palette (blue-teal-green gradient)
- Mobile-responsive (md: 768px, lg: 1024px breakpoints)
- Component library in `frontend/src/index.css`
- 8px spacing system

## 📝 Environment Variables

### Frontend
- `VITE_API_URL` - Backend API URL (set in Vercel)
  - Production: `https://nfl-epa-api.onrender.com`
  - Development: `http://localhost:8000`

### Backend
- `PORT` - Server port (auto-set by Render)

## 🔧 Common Tasks

### Update CORS (if adding new domains)
Edit `backend/app/main.py` → `allow_origins` list

### Add new NFL teams
Update `frontend/src/data/teams.json`

### Update models with new season data
1. Download latest nflfastR data
2. Re-run training notebooks
3. Replace model files in `/models`
4. Commit and push (will auto-deploy)

## 🐛 Troubleshooting

### Backend won't start
- Check models exist in `/models` directory
- Verify `requirements.txt` installed: `pip install -r backend/requirements.txt`
- Models must be in correct path relative to `backend/app/main.py`

### Frontend API calls fail
- Check CORS settings in `backend/app/main.py`
- Verify `VITE_API_URL` environment variable set
- Check backend is running and accessible

### Render deployment fails
- Check Render logs for Python/dependency errors
- Verify `runtime.txt` has correct Python version
- Ensure `requirements.txt` has all dependencies

## 📚 Documentation
- Full deployment guide: `DEPLOYMENT.md`
- Design system: `DESIGN_SYSTEM.md`
- Original requirements: `REQUIREMENTS.md`

## 🔄 Git Workflow
- Main branch deploys automatically to production
- Use descriptive commit messages
- Large data files are gitignored

## ✅ Project Status
**Phase 5: Deployment** - ✅ COMPLETE
- [x] Backend deployed to Render
- [x] Frontend deployed to Vercel
- [x] CORS configured
- [x] Both APIs operational
- [x] Design system implemented
- [x] Mobile responsive

**Next Steps (Optional):**
- Custom domain setup
- Analytics integration
- Performance monitoring
- Additional features (dark mode, scenario comparison, etc.)
