# Landing Page - Quick Start Guide

## 🚀 Quick Start (5 Minutes)

### 1. View Landing Page
```bash
npm run dev
# Open http://localhost:5173/
```

### 2. Customize School Name
Edit `src/pages/LandingPage.jsx` (lines 85-87):
```jsx
<h1 className="font-bold text-lg">YOUR SCHOOL NAME</h1>
<p className="text-xs text-blue-100">YOUR TAGLINE</p>
```

### 3. Customize Menu Items
Edit `src/pages/LandingPage.jsx` (lines 10-18):
```jsx
const menuItems = [
  { icon: Calendar, label: 'Jadwal\nUjian', color: 'bg-blue-500' },
  { icon: Megaphone, label: 'Pengumuman', color: 'bg-green-500' },
  // ... add/remove items as needed
]
```

### 4. Customize Announcements
Edit `src/pages/LandingPage.jsx` (lines 20-40):
```jsx
const announcements = [
  {
    icon: Calendar,
    title: 'Your Announcement Title',
    date: 'Your Date',
  },
  // ... add more announcements
]
```

### 5. Build & Deploy
```bash
npm run build
# Deploy to Vercel
```

---

## 📋 File Locations

| File | Purpose |
|------|---------|
| `src/pages/LandingPage.jsx` | Main landing page component |
| `src/routes/index.jsx` | Route configuration |
| `src/pages/index.js` | Page exports |
| `LANDING_PAGE_GUIDE.md` | Detailed customization guide |
| `LANDING_PAGE_PREVIEW.md` | Design specifications |
| `LANDING_PAGE_INTEGRATION.md` | Data integration guide |

---

## 🎨 Customization Examples

### Change Hero Card Text
```jsx
// Line 95-99
<p className="text-sm mb-2">Your Welcome Message 👋</p>
<h2 className="text-3xl font-bold mb-2">Your Title</h2>
<p className="text-sm mb-4 text-blue-100">Your Subtitle</p>
```

### Change Button Color
```jsx
// Change from white to blue
className="bg-blue-600 text-white px-6 py-2 rounded-full..."
```

### Change Menu Colors
```jsx
// Available TailwindCSS colors:
'bg-blue-500'      // Blue
'bg-green-500'     // Green
'bg-purple-500'    // Purple
'bg-orange-500'    // Orange
'bg-pink-500'      // Pink
'bg-teal-500'      // Teal
'bg-yellow-500'    // Yellow
'bg-red-500'       // Red
'bg-indigo-500'    // Indigo
```

### Add New Menu Item
```jsx
const menuItems = [
  // ... existing items ...
  { icon: Settings, label: 'Pengaturan', color: 'bg-gray-500' },
]
```

### Remove Menu Item
```jsx
// Just delete the line from menuItems array
```

---

## 🔧 Common Tasks

### Task 1: Change School Logo
Replace emoji in header (line 82):
```jsx
<div className="w-10 h-10 bg-yellow-300 rounded-full flex items-center justify-center text-lg">
  🛡️  {/* Change this emoji */}
</div>
```

### Task 2: Change Hero Illustration
Replace emoji in hero card (line 100):
```jsx
<div className="text-6xl">👨‍💼</div>  {/* Change this emoji */}
```

### Task 3: Add Notification Badge
Add to bell icon (line 89):
```jsx
<div className="relative">
  <button className="text-2xl">🔔</button>
  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
    3
  </span>
</div>
```

### Task 4: Change Bottom Navigation
Edit bottomNav array (lines 42-48):
```jsx
const bottomNav = [
  { icon: Home, label: 'Beranda', active: true },
  { icon: CheckSquare, label: 'Ujian' },
  // ... add/remove items
]
```

### Task 5: Add Link to Menu Item
Update menu item click handler:
```jsx
<button
  onClick={() => navigate('/path/to/page')}
  className="..."
>
  {/* ... */}
</button>
```

---

## 🎯 Integration Checklist

- [ ] Landing page displays correctly
- [ ] All buttons are clickable
- [ ] Navigation works
- [ ] Responsive on mobile
- [ ] Responsive on tablet
- [ ] Responsive on desktop
- [ ] No console errors
- [ ] Build completes successfully
- [ ] Ready for data integration

---

## 📱 Testing on Different Devices

### Mobile (375px)
```bash
# Chrome DevTools: iPhone 12
# Check: Touch targets, spacing, readability
```

### Tablet (768px)
```bash
# Chrome DevTools: iPad
# Check: Layout, spacing, navigation
```

### Desktop (1024px+)
```bash
# Full browser
# Check: Layout, spacing, responsiveness
```

---

## 🐛 Troubleshooting

### Landing page not showing
```bash
# Check if route is correct
# Verify LandingPage.jsx exists
# Check console for errors
npm run dev
```

### Styling looks wrong
```bash
# Rebuild Tailwind CSS
npm run dev
# Clear browser cache (Ctrl+Shift+Delete)
```

### Build fails
```bash
# Clear node_modules
rm -r node_modules
npm install
npm run build
```

### Icons not showing
```bash
# Verify lucide-react is installed
npm list lucide-react
# Reinstall if needed
npm install lucide-react
```

---

## 📚 Documentation Files

1. **LANDING_PAGE_GUIDE.md** - Complete customization guide
2. **LANDING_PAGE_PREVIEW.md** - Design specifications
3. **LANDING_PAGE_INTEGRATION.md** - Data integration guide
4. **LANDING_PAGE_SUMMARY.md** - Implementation summary
5. **LANDING_PAGE_QUICKSTART.md** - This file

---

## 🚀 Next Steps

### Immediate (Today)
- [ ] View landing page
- [ ] Customize school name
- [ ] Test on mobile

### Short Term (This Week)
- [ ] Customize menu items
- [ ] Customize announcements
- [ ] Test all navigation
- [ ] Deploy to Vercel

### Medium Term (This Month)
- [ ] Integrate with Supabase
- [ ] Add dynamic data
- [ ] Add animations
- [ ] Optimize performance

### Long Term (This Quarter)
- [ ] Add more features
- [ ] Gather user feedback
- [ ] Iterate on design
- [ ] Scale to production

---

## 💡 Tips & Tricks

### Tip 1: Use Emojis for Icons
Instead of complex icons, use emojis for quick customization:
```jsx
<div className="text-4xl">📚</div>
```

### Tip 2: Copy & Paste Menu Items
Duplicate menu items for quick additions:
```jsx
{ icon: Calendar, label: 'Jadwal\nUjian', color: 'bg-blue-500' },
{ icon: Calendar, label: 'Jadwal\nUjian', color: 'bg-blue-500' }, // Copy
```

### Tip 3: Use Browser DevTools
- Inspect elements to find classes
- Edit CSS in real-time
- Test responsive design

### Tip 4: Color Picker
Use online color picker to find TailwindCSS colors:
- https://tailwindcss.com/docs/customizing-colors

### Tip 5: Icon Library
Browse Lucide React icons:
- https://lucide.dev/

---

## 🎓 Learning Resources

### React
- https://react.dev
- https://react.dev/learn

### TailwindCSS
- https://tailwindcss.com
- https://tailwindcss.com/docs

### React Router
- https://reactrouter.com
- https://reactrouter.com/docs

### Lucide React
- https://lucide.dev
- https://lucide.dev/icons

---

## 📞 Support

### Getting Help
1. Check documentation files
2. Review source code comments
3. Check browser console
4. Search online for similar issues

### Common Issues
- **Page not loading**: Check route configuration
- **Styling broken**: Clear cache and rebuild
- **Icons missing**: Verify lucide-react installation
- **Build fails**: Check console for errors

---

## ✅ Success Checklist

- ✅ Landing page created
- ✅ Responsive design implemented
- ✅ Navigation integrated
- ✅ Build successful
- ✅ Documentation complete
- ✅ Ready for customization
- ✅ Ready for deployment

---

## 🎉 You're All Set!

Your landing page is ready to use. Start by:

1. Running `npm run dev`
2. Opening http://localhost:5173/
3. Customizing school name and content
4. Testing on different devices
5. Deploying to production

Happy coding! 🚀
