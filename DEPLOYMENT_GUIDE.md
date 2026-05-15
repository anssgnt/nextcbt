# NextCBT Deployment Guide

## Step-by-Step Deployment to Vercel + Supabase

### Phase 1: Supabase Setup

#### 1. Create Supabase Project
1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - Name: nextcbt
   - Database Password: (strong password)
   - Region: Choose closest to your users
5. Wait for project to initialize (2-3 minutes)

#### 2. Set Up Database
1. Go to SQL Editor
2. Click "New Query"
3. Copy entire content from `supabase.sql`
4. Paste into SQL editor
5. Click "Run"
6. Wait for tables to be created

#### 3. Get API Keys
1. Go to Settings > API
2. Copy:
   - Project URL (VITE_SUPABASE_URL)
   - Anon Key (VITE_SUPABASE_ANON_KEY)
3. Save these securely

#### 4. Set Up Authentication
1. Go to Authentication > Providers
2. Enable Email provider (already enabled)
3. Go to Authentication > URL Configuration
4. Add authorized redirect URLs:
   - http://localhost:5173 (development)
   - https://your-domain.vercel.app (production)

#### 5. Create Admin User
1. Go to Authentication > Users
2. Click "Invite"
3. Enter admin email
4. Set password
5. Send invitation

### Phase 2: GitHub Setup

#### 1. Initialize Git Repository
```bash
cd nextcbt
git init
git add .
git commit -m "Initial commit: NextCBT application"
```

#### 2. Create GitHub Repository
1. Go to https://github.com/new
2. Create repository "nextcbt"
3. Don''t initialize with README
4. Copy repository URL

#### 3. Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/nextcbt.git
git branch -M main
git push -u origin main
```

### Phase 3: Vercel Deployment

#### 1. Connect to Vercel
1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "Import Project"
4. Select your nextcbt repository
5. Click "Import"

#### 2. Configure Environment Variables
1. In Vercel project settings
2. Go to Environment Variables
3. Add:
   - Name: VITE_SUPABASE_URL
     Value: (your Supabase URL)
   - Name: VITE_SUPABASE_ANON_KEY
     Value: (your Supabase Anon Key)
4. Click "Save"

#### 3. Deploy
1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Get your deployment URL
4. Test the application

#### 4. Update Supabase Redirect URLs
1. Go back to Supabase
2. Settings > URL Configuration
3. Add your Vercel URL to authorized redirects:
   - https://your-app.vercel.app

### Phase 4: Post-Deployment Setup

#### 1. Add Sample Data
```sql
-- Add a class
INSERT INTO classes (name, grade) VALUES (''Class 7A'', 7);

-- Add students
INSERT INTO students (name, class_id) VALUES 
  (''Ahmad Rizki'', (SELECT id FROM classes LIMIT 1)),
  (''Siti Nurhaliza'', (SELECT id FROM classes LIMIT 1)),
  (''Budi Santoso'', (SELECT id FROM classes LIMIT 1));

-- Add subject
INSERT INTO subjects (name, code) VALUES (''Mathematics'', ''MATH'');

-- Add exam
INSERT INTO exams (title, subject_id, class_id, duration, token, is_active) 
VALUES (''Math Quiz 1'', (SELECT id FROM subjects LIMIT 1), (SELECT id FROM classes LIMIT 1), 30, ''ABC123'', true);
```

#### 2. Test Student Login
1. Go to your Vercel URL
2. Type a student name
3. Select from suggestions
4. Enter exam token: ABC123
5. Click "Start Exam"

#### 3. Test Admin Login
1. Go to your-app.vercel.app/admin/login
2. Enter admin email
3. Enter admin password
4. Access dashboard

### Phase 5: Optimization for FREE Tier

#### Vercel FREE Tier Limits
- 100GB bandwidth/month
- 12 serverless function invocations/month (not used)
- Automatic deployments
- Custom domains available

**How we stay within limits:**
- SPA (no server-side rendering)
- Static assets cached
- Minimal API calls
- Lazy loading routes
- Code splitting

#### Supabase FREE Tier Limits
- 500MB database storage
- 1GB file storage
- 2 million monthly active users
- Real-time disabled (good for performance)

**How we stay within limits:**
- Efficient database queries
- Indexed columns
- Local caching
- Minimal file uploads
- No real-time subscriptions

### Phase 6: Monitoring & Maintenance

#### Monitor Vercel
1. Go to Vercel Dashboard
2. Check Analytics
3. Monitor bandwidth usage
4. Check error logs

#### Monitor Supabase
1. Go to Supabase Dashboard
2. Check Storage usage
3. Monitor database size
4. Check API usage

#### Regular Maintenance
- Weekly: Check error logs
- Monthly: Review database size
- Monthly: Check bandwidth usage
- Quarterly: Update dependencies

### Troubleshooting

#### Build Fails on Vercel
1. Check build logs
2. Ensure all dependencies are in package.json
3. Check environment variables are set
4. Try rebuilding

#### Login Not Working
1. Check Supabase URL and keys
2. Verify redirect URLs in Supabase
3. Check browser console for errors
4. Clear browser cache

#### Exam Not Loading
1. Check database connection
2. Verify exam token exists
3. Check student exists in database
4. Check browser console for errors

#### Slow Performance
1. Check network tab in DevTools
2. Verify images are optimized
3. Check Supabase query performance
4. Enable caching headers

### Custom Domain Setup

#### Add Custom Domain to Vercel
1. Go to Vercel Project Settings
2. Domains
3. Add your domain
4. Follow DNS configuration
5. Wait for SSL certificate (24 hours)

#### Update Supabase Redirect URLs
1. Add your custom domain to authorized redirects
2. Format: https://yourdomain.com

### Backup & Recovery

#### Backup Database
1. Go to Supabase Dashboard
2. Settings > Backups
3. Enable automatic backups
4. Download manual backup if needed

#### Restore from Backup
1. Contact Supabase support
2. Provide backup date
3. They will restore for you

### Performance Optimization Checklist

- [x] Code splitting enabled
- [x] Route lazy loading
- [x] Image optimization
- [x] Local caching
- [x] Debounced search
- [x] Minimal re-renders
- [x] Efficient queries
- [x] Service worker
- [x] PWA support
- [x] Mobile optimized

### Security Checklist

- [x] HTTPS enforced
- [x] RLS policies enabled
- [x] Environment variables secured
- [x] No secrets in code
- [x] Input validation
- [x] CORS configured
- [x] Admin routes protected
- [x] Session validation

### Cost Estimation (Monthly)

**Vercel FREE:** $0
- 100GB bandwidth included
- Perfect for this app

**Supabase FREE:** $0
- 500MB storage included
- Perfect for this app

**Total Monthly Cost: $0**

If you exceed FREE tier limits:
- Vercel: $0.15 per GB over 100GB
- Supabase: $25/month for Pro plan

### Next Steps

1. Deploy to Vercel
2. Test all features
3. Add sample data
4. Share with users
5. Monitor performance
6. Gather feedback
7. Iterate and improve
