# NextCBT Setup Guide

## Quick Start (5 minutes)

### 1. Install Dependencies
```bash
cd nextcbt
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Start Development Server
```bash
npm run dev
```

Open http://localhost:5173

## Detailed Setup

### Prerequisites
- Node.js 16+ (https://nodejs.org)
- npm or yarn
- Git
- Supabase account (free at https://supabase.com)

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with email or GitHub
4. Click "New Project"
5. Fill in:
   - Project name: `nextcbt`
   - Database password: (strong password, save it)
   - Region: Choose closest to your location
6. Click "Create new project"
7. Wait 2-3 minutes for initialization

### Step 2: Set Up Database Schema

1. In Supabase dashboard, go to "SQL Editor"
2. Click "New Query"
3. Copy entire content from `supabase.sql` file
4. Paste into the SQL editor
5. Click "Run"
6. Wait for all tables to be created

### Step 3: Get API Credentials

1. Go to Settings > API
2. Copy these values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon Key** → `VITE_SUPABASE_ANON_KEY`
3. Save them securely

### Step 4: Configure Authentication

1. Go to Authentication > Providers
2. Email provider should be enabled by default
3. Go to Authentication > URL Configuration
4. Add authorized redirect URLs:
   - `http://localhost:5173` (development)
   - `http://localhost:5173/admin/login`
   - `http://localhost:5173/student/login`

### Step 5: Create Admin User

1. Go to Authentication > Users
2. Click "Invite user"
3. Enter admin email (e.g., admin@example.com)
4. Click "Send invite"
5. Check email for invitation link
6. Set password
7. Admin account is ready

### Step 6: Add Sample Data

In Supabase SQL Editor, run:

```sql
-- Add a class
INSERT INTO classes (name, grade) VALUES (''Class 7A'', 7);

-- Add students
INSERT INTO students (name, class_id) VALUES 
  (''Ahmad Rizki'', (SELECT id FROM classes LIMIT 1)),
  (''Siti Nurhaliza'', (SELECT id FROM classes LIMIT 1)),
  (''Budi Santoso'', (SELECT id FROM classes LIMIT 1)),
  (''Dewi Lestari'', (SELECT id FROM classes LIMIT 1)),
  (''Roni Hermawan'', (SELECT id FROM classes LIMIT 1));

-- Add subject
INSERT INTO subjects (name, code) VALUES (''Mathematics'', ''MATH'');

-- Add exam
INSERT INTO exams (title, subject_id, class_id, duration, token, is_active) 
VALUES (''Math Quiz 1'', (SELECT id FROM subjects LIMIT 1), (SELECT id FROM classes LIMIT 1), 30, ''ABC123'', true);

-- Add questions
INSERT INTO questions (exam_id, question_text, type, "order", correct_answer) 
VALUES 
  ((SELECT id FROM exams LIMIT 1), ''What is 2 + 2?'', ''multiple_choice'', 1, ''1''),
  ((SELECT id FROM exams LIMIT 1), ''What is 5 * 3?'', ''multiple_choice'', 2, ''2'');

-- Add options for first question
INSERT INTO options (question_id, option_text, is_correct, "order") 
VALUES 
  ((SELECT id FROM questions LIMIT 1), ''3'', false, 1),
  ((SELECT id FROM questions LIMIT 1), ''4'', true, 2),
  ((SELECT id FROM questions LIMIT 1), ''5'', false, 3),
  ((SELECT id FROM questions LIMIT 1), ''6'', false, 4);
```

### Step 7: Install and Run Locally

```bash
# Clone or navigate to project
cd nextcbt

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
# (Use your editor or command line)

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser

## Testing the Application

### Test Student Login

1. Go to http://localhost:5173
2. You should see student login page
3. Type "Ahmad" in student name field
4. Select "Ahmad Rizki" from dropdown
5. Enter exam token: `ABC123`
6. Click "Start Exam"
7. You should see exam page with questions

### Test Admin Login

1. Go to http://localhost:5173/admin/login
2. Enter admin email (the one you created)
3. Enter admin password
4. Click "Sign In"
5. You should see admin dashboard
6. Click "Manage Students" to see student list
7. Click "Manage Exams" to see exams

## Project Structure

```
nextcbt/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   ├── Toast.jsx
│   │   ├── Skeleton.jsx
│   │   ├── ErrorBoundary.jsx
│   │   └── index.js
│   ├── pages/               # Page components
│   │   ├── StudentLogin.jsx
│   │   ├── ExamPage.jsx
│   │   ├── ResultPage.jsx
│   │   ├── AdminLogin.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminStudents.jsx
│   │   ├── AdminExams.jsx
│   │   ├── AdminQuestions.jsx
│   │   ├── AdminResults.jsx
│   │   └── index.js
│   ├── hooks/               # Custom React hooks
│   │   └── useExam.js
│   ├── store/               # Zustand state management
│   │   └── index.js
│   ├── services/            # API service functions
│   │   └── api.js
│   ├── lib/                 # Library setup
│   │   └── supabase.js
│   ├── utils/               # Utility functions
│   │   └── helpers.js
│   ├── routes/              # Route configuration
│   │   └── index.jsx
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── public/
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # Service worker
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── supabase.sql             # Database schema
├── .env.example
├── .env.local               # Your local env vars
├── .gitignore
├── README.md
├── SETUP_GUIDE.md           # This file
└── DEPLOYMENT_GUIDE.md
```

## Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Troubleshooting

### "Cannot find module" errors
**Solution:** Run `npm install` again

### Supabase connection fails
**Solution:** 
- Check `.env.local` has correct URL and key
- Verify Supabase project is running
- Check network connection

### Student login not working
**Solution:**
- Verify student exists in database
- Check exam token is correct
- Check browser console for errors

### Admin login not working
**Solution:**
- Verify admin user was created
- Check email and password are correct
- Check redirect URLs in Supabase

### Exam page not loading
**Solution:**
- Check exam exists in database
- Verify questions are added to exam
- Check browser console for errors

### Slow performance
**Solution:**
- Check network tab in DevTools
- Verify Supabase queries are optimized
- Check for console errors

## Development Tips

### Hot Module Replacement (HMR)
Vite automatically reloads when you save files. No need to refresh!

### React DevTools
Install React DevTools browser extension for debugging

### Supabase Studio
Use Supabase Studio to:
- View/edit database data
- Run SQL queries
- Monitor API usage
- Check authentication logs

### Local Storage
Exam data is cached in localStorage for offline support

## Performance Optimization

### Already Optimized
- ✅ Code splitting with Vite
- ✅ Route lazy loading
- ✅ Component memoization
- ✅ Debounced search
- ✅ Local caching
- ✅ Minimal dependencies
- ✅ TailwindCSS (no unused CSS)
- ✅ Service worker for PWA

### Monitor Performance
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Click "Analyze page load"
4. Check scores (target: 90+)

## Security Checklist

- ✅ Environment variables not in code
- ✅ Supabase RLS policies enabled
- ✅ Admin routes protected
- ✅ Input validation
- ✅ HTTPS in production
- ✅ No sensitive data in localStorage
- ✅ CORS configured

## Next Steps

1. ✅ Local setup complete
2. → Test all features
3. → Add more sample data
4. → Deploy to Vercel (see DEPLOYMENT_GUIDE.md)
5. → Share with users
6. → Gather feedback
7. → Iterate and improve

## Support

For issues:
1. Check troubleshooting section
2. Check browser console (F12)
3. Check Supabase logs
4. Create GitHub issue

## Resources

- React: https://react.dev
- Vite: https://vitejs.dev
- TailwindCSS: https://tailwindcss.com
- Supabase: https://supabase.com/docs
- React Router: https://reactrouter.com
- Zustand: https://github.com/pmndrs/zustand
