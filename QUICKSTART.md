# NextCBT Quick Start Guide

## 5-Minute Setup

### Step 1: Install Dependencies (2 min)
```bash
cd C:\laragon\www\nextcbt
npm install
```

### Step 2: Configure Environment (1 min)
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 3: Start Development (2 min)
```bash
npm run dev
```

Open: http://localhost:5173

## Student Login Test

1. Type student name: "Ahmad"
2. Select "Ahmad Rizki"
3. Enter exam token: "ABC123"
4. Click "Start Exam"

## Admin Login Test

1. Go to: http://localhost:5173/admin/login
2. Email: admin@example.com
3. Password: (your admin password)
4. Click "Sign In"

## Key Files to Know

- `src/pages/StudentLogin.jsx` - Student login
- `src/pages/ExamPage.jsx` - Exam interface
- `src/pages/AdminDashboard.jsx` - Admin panel
- `src/services/api.js` - API calls
- `src/store/index.js` - State management
- `supabase.sql` - Database schema

## Deployment Checklist

- [ ] Local testing complete
- [ ] Supabase project created
- [ ] Database schema imported
- [ ] Admin user created
- [ ] Sample data added
- [ ] GitHub repository created
- [ ] Vercel project connected
- [ ] Environment variables set
- [ ] Deployed to Vercel
- [ ] Production testing complete

## Common Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Troubleshooting

**npm install fails:**
```bash
npm cache clean --force
npm install
```

**Port 5173 already in use:**
```bash
npm run dev -- --port 3000
```

**Supabase connection error:**
- Check .env.local has correct URL and key
- Verify Supabase project is running
- Check network connection

## Documentation Files

- `README.md` - Project overview
- `SETUP_GUIDE.md` - Detailed setup
- `DEPLOYMENT_GUIDE.md` - Production deployment
- `PROJECT_SUMMARY.md` - Complete summary
- `supabase.sql` - Database schema

## Support

For issues:
1. Check browser console (F12)
2. Check Supabase logs
3. Review documentation files
4. Check GitHub issues

## Next: Deploy to Vercel

See DEPLOYMENT_GUIDE.md for step-by-step instructions.
