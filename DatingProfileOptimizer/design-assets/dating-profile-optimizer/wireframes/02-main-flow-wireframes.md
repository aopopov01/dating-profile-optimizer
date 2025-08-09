# Dating Profile Optimizer - Main Flow Wireframes
*Core app functionality wireframes*

## Screen 8: Photo Upload Hub
```
┌─────────────────────────────────┐
│ [☰] Photo Upload          [💰] │
├─────────────────────────────────┤
│                                 │
│      Upload Your Photos         │
│                                 │
│   Select 3-10 photos for AI    │
│   analysis and optimization     │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [📷] [📷] [📷] [+]          │ │
│ │                             │ │
│ │ [📷] [📷] [+]   [+]          │ │
│ │                             │ │
│ │ [+]   [+]   [+]  [+]          │ │
│ └─────────────────────────────┘ │
│                                 │
│        3/10 photos selected     │
│                                 │
│ 💡 Include mix of close-ups,    │
│    full body, and activities    │
│                                 │
│                                 │
│     [Continue to Analysis]      │
│                                 │
├─────────────────────────────────┤
│ [📸][📊][✍️][💎] Tab Bar       │
└─────────────────────────────────┘
```

### Elements:
- **Header**: Hamburger menu, title, premium upgrade icon
- **Instructions**: Clear photo requirements
- **Grid**: 3x4 photo upload grid with add buttons
- **Counter**: Current photo count with maximum
- **Tips**: Helpful guidance for photo selection
- **CTA**: Primary action button
- **Bottom Tab**: Navigation to main sections

---

## Screen 9: Camera/Gallery Selection
```
┌─────────────────────────────────┐
│ [<] Add Photo                   │
├─────────────────────────────────┤
│                                 │
│    Choose Photo Source          │
│                                 │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │        [📷]                 │ │
│ │                             │ │
│ │     Take New Photo          │ │
│ │                             │ │
│ │   Use your camera to take   │ │
│ │   a fresh photo right now   │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │        [📁]                 │ │
│ │                             │ │
│ │    Choose from Gallery      │ │
│ │                             │ │
│ │   Select existing photos    │ │
│ │   from your photo library   │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│              [Cancel]           │
└─────────────────────────────────┘
```

---

## Screen 10: Photo Analysis Loading
```
┌─────────────────────────────────┐
│ [<] Analyzing Photos            │
├─────────────────────────────────┤
│                                 │
│    AI Photo Analysis in         │
│         Progress...             │
│                                 │
│        [Progress Ring]          │
│           68%                   │
│                                 │
│     Analyzing facial features   │
│                                 │
│                                 │
│    [Current Photo Preview]      │
│                                 │
│                                 │
│ ✓ Photo 1: Composition analysis│
│ ✓ Photo 2: Facial scoring      │
│ ⏳ Photo 3: Background check    │
│ ⏸️  Photo 4: Pending analysis    │
│ ⏸️  Photo 5: Pending analysis    │
│                                 │
│                                 │
│         [Cancel Process]        │
└─────────────────────────────────┘
```

---

## Screen 11: Photo Analysis Results
```
┌─────────────────────────────────┐
│ [<] Analysis Results      [📤] │
├─────────────────────────────────┤
│                                 │
│      Your Photo Scores          │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [Photo 1] 94/100  ⭐ BEST   │ │
│ │ Great smile, good lighting  │ │
│ │ [View Details]              │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [Photo 2] 87/100            │ │
│ │ Nice composition, crop face │ │
│ │ [View Details]              │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [Photo 3] 76/100            │ │
│ │ Dark lighting, try brighter │ │
│ │ [View Details] [❌ Remove]    │ │
│ └─────────────────────────────┘ │
│                                 │
│    📊 Overall Profile Score     │
│           85/100                │
│                                 │
│      [Generate Bio]             │
├─────────────────────────────────┤
│ [📸][📊][✍️][💎] Tab Bar       │
└─────────────────────────────────┘
```

---

## Screen 12: Photo Detail Analysis
```
┌─────────────────────────────────┐
│ [<] Photo Analysis Detail       │
├─────────────────────────────────┤
│                                 │
│    [Large Photo Preview]        │
│                                 │
│         Score: 94/100           │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ✓ Facial Expression    95   │ │
│ │   Genuine, warm smile       │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ✓ Eye Contact          90   │ │
│ │   Direct, confident gaze    │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ✓ Composition          92   │ │
│ │   Good framing, rule of 3   │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ⚠️  Background          85   │ │
│ │   Could be more interesting │ │
│ └─────────────────────────────┘ │
│                                 │
│ 💡 Recommendation: This is your│
│    strongest photo - use as    │
│    your primary profile image  │
│                                 │
│         [Set as Primary]        │
└─────────────────────────────────┘
```

---

## Screen 13: Bio Generation Setup
```
┌─────────────────────────────────┐
│ [<] Create Your Bio             │
├─────────────────────────────────┤
│                                 │
│     Tell us about yourself      │
│                                 │
│   Answer a few questions to     │
│   generate your perfect bio     │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Age                         │ │
│ │ [28            ] [dropdown] │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Occupation                  │ │
│ │ [Software Engineer........] │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Interests (select 3-5)      │ │
│ │ [Travel] [Hiking] [Coffee]  │ │
│ │ [Music] [Cooking] [Fitness] │ │
│ │ [Art] [Books] [Photography] │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Personality Type            │ │
│ │ ○ Outgoing & Social         │ │
│ │ ● Thoughtful & Creative     │ │
│ │ ○ Adventurous & Spontaneous │ │
│ └─────────────────────────────┘ │
│                                 │
│      [Generate Bios]            │
└─────────────────────────────────┘
```

---

## Screen 14: Bio Selection Interface
```
┌─────────────────────────────────┐
│ [<] Choose Your Bio             │
├─────────────────────────────────┤
│                                 │
│    Your Personalized Bios       │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ● Professional    Match: 92%│ │
│ │                       [🔄] │ │
│ │ Software engineer by day,   │ │
│ │ adventure seeker by weeknd. │ │
│ │ I debug code and find the   │ │
│ │ best hiking trails...       │ │
│ │                             │ │
│ │ 156 characters  ✨ Recommended│
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ○ Casual & Fun    Match: 88%│ │
│ │                       [🔄] │ │
│ │ Just a guy who loves good   │ │
│ │ food, great music, and even │ │
│ │ better conversations. I...  │ │
│ │                             │ │
│ │ 142 characters              │ │
│ └─────────────────────────────┘ │
│                                 │
│       Regenerations: 1/3        │
│                                 │
│     [Continue with Bio]         │
├─────────────────────────────────┤
│ [📸][📊][✍️][💎] Tab Bar       │
└─────────────────────────────────┘
```

---

## Screen 15: Final Optimized Profile
```
┌─────────────────────────────────┐
│ [<] Your Optimized Profile [📤]│
├─────────────────────────────────┤
│                                 │
│     🎉 Profile Complete!        │
│                                 │
│   Your optimized dating profile │
│                                 │
│ ┌─────────────────────────────┐ │
│ │    [Primary Photo]          │ │
│ │                             │ │
│ │ Software engineer by day,   │ │
│ │ adventure seeker by weekend.│ │
│ │ I can debug your code and   │ │
│ │ find the best hiking trails.│ │
│ │                             │ │
│ │ [Photo 2][Photo 3][Photo 4] │ │
│ └─────────────────────────────┘ │
│                                 │
│ 📊 Predicted Performance:       │
│ • 85% Profile Attractiveness   │
│ • +300% Expected Match Increase │ │
│ • 92% Bio Personality Match     │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [Export to Tinder]          │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [Export to Bumble]          │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [Save Photos to Gallery]    │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## Screen 16: Before/After Comparison
```
┌─────────────────────────────────┐
│ [<] Before & After              │
├─────────────────────────────────┤
│                                 │
│      Your Transformation        │
│                                 │
│ ┌─────────────┬─────────────────┐ │
│ │   BEFORE    │      AFTER      │ │
│ ├─────────────┼─────────────────┤ │
│ │ [Old Photo] │ [Optimized]     │ │
│ │             │                 │ │
│ │ Score: 64   │ Score: 94       │ │
│ │             │                 │ │
│ │ [Old Bio]   │ [New Bio]       │ │
│ │ Basic info  │ Engaging copy   │ │
│ │             │                 │ │
│ │ Expected:   │ Expected:       │ │
│ │ 5 matches/  │ 20 matches/     │ │
│ │ week        │ week            │ │
│ └─────────────┴─────────────────┘ │
│                                 │
│    📈 Overall Improvement       │
│         +300% Match Rate        │
│                                 │
│         [Share Results]         │
│                                 │
│       [Start New Profile]       │
└─────────────────────────────────┘
```

---

## Design Principles Applied:

### Information Architecture:
1. **Linear Flow**: Logical step-by-step progression
2. **Clear Navigation**: Back buttons and progress indicators
3. **Contextual Actions**: Relevant buttons for each screen
4. **Tab Structure**: Consistent bottom navigation

### Android Material Design:
1. **Cards**: Elevated surfaces for content grouping
2. **FAB**: Floating action buttons for primary actions
3. **Typography**: Roboto font with proper hierarchy
4. **Colors**: Pink primary with proper contrast ratios
5. **Touch Targets**: 48dp minimum for all interactions

### User Experience:
1. **Progressive Disclosure**: Information revealed when needed
2. **Immediate Feedback**: Loading states and confirmations
3. **Error Prevention**: Clear instructions and validation
4. **Flexibility**: Options to edit, retry, or skip
5. **Achievement**: Success celebrations and metrics

### Conversion Optimization:
1. **Social Proof**: Success metrics and testimonials
2. **Scarcity**: Limited regenerations encourage upgrade
3. **Value Demonstration**: Before/after comparisons
4. **Clear CTAs**: Prominent action buttons
5. **Friction Reduction**: Simplified input methods