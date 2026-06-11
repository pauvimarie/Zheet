# Zheet — Digital Worksheet PWA

A paper-feel digital worksheet and mock exam companion.

## Setup

### 1. Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Email/Password
4. Enable **Firestore Database**
5. Enable **Hosting**

### 2. Configure Environment
```bash
cp .env.example .env
```
Fill in your Firebase config values in `.env`.

### 3. Deploy Firestore Rules & Indexes
```bash
firebase login
firebase use your-project-id
firebase deploy --only firestore
```

### 4. Install & Run
```bash
npm install
npm run dev       # development
npm run build     # production build
```

### 5. Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

## Features
- 📝 Bubble sheet & written answer worksheets
- ⏱️ Timed exam mode with auto-submit
- ✓/✗ Manual answer checking
- 📊 Live accuracy tracking
- 🔄 Real-time sync across all devices
- 📱 PWA — installable on iOS, Android, desktop
- 🌙 Light/dark mode
- 📚 Worksheet library with search & filter
- 📈 Category proficiency tracking (Verbal, Analytical, Numerical, General Information)

## Firestore Schema

```
/worksheets/{id}
  userId: string
  config: WorksheetConfig
  answers: QuestionAnswer[]
  startedAt: Timestamp
  completedAt?: Timestamp
  timeTaken?: number
  isComplete: boolean
  correct: number
  wrong: number
  checked: number

/stats/{userId}
  totalWorksheets: number
  totalQuestions: number
  totalCorrect: number
  totalWrong: number
  overallAccuracy: number
  proficiency: { [Category]: CategoryProficiency }
```
