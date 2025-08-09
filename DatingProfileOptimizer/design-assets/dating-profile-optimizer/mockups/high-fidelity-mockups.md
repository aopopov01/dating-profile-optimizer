# Dating Profile Optimizer - High-Fidelity Mockups
*Detailed visual specifications for Android Material Design 3*

## Mockup 1: Welcome Screen
```
Visual Design Specifications:

Background: Linear gradient from #E91E63 (top) to #AD1457 (bottom)
Status Bar: Immersive mode with white icons

┌─────────────────────────────────┐
│ 🔋96% ⚫⚫⚫⚫ 📶 10:30 AM      │ ← Status bar: white icons on pink
├─────────────────────────────────┤
│ Gradient Background (#E91E63→#AD1457)
│                                 │
│        [Heart Logo Icon]        │ ← 64dp heart with gradient fill
│     ❤️ 💕 ❤️ floating hearts    │ ← Animated floating hearts
│                                 │
│   DATING PROFILE OPTIMIZER      │ ← Roboto, 28sp, White, Bold
│                                 │
│  AI-Powered Dating Success      │ ← Roboto, 18sp, White 85% opacity
│                                 │
│  [Illustrated couple graphic    │ ← Colorful illustration
│   with hearts and chat bubbles] │   showing dating success
│                                 │
│   "Increase your matches        │ ← Roboto, 16sp, White
│     by 300%+"                   │   Centered text
│                                 │
│ ┌─────────────────────────────┐ │
│ │      GET STARTED            │ │ ← Material Button:
│ │                             │ │   Height: 48dp
│ │                             │ │   Corner radius: 8dp
│ └─────────────────────────────┘ │   Background: White
│                                 │   Text: #E91E63, Roboto Medium 16sp
│     Already have account?       │ ← Roboto, 14sp, White 70% opacity
│        [Sign In]                │ ← Underlined link, White
│                                 │
├─────────────────────────────────┤
│     ● ○ ○ ○                    │ ← Page indicators: White dots
└─────────────────────────────────┘   Active: solid, Inactive: 50% opacity

Animations:
- Floating hearts: Continuous upward drift with fade
- Gradient: Subtle color shift animation
- Button: Ripple effect on press (Material Design)
- Illustration: Gentle bouncing animation
```

---

## Mockup 2: Photo Upload Hub
```
Visual Design Specifications:

Header: Material Design 3 TopAppBar
Background: #F5F5F5 (Material Grey 50)

┌─────────────────────────────────┐
│ ☰    Photo Upload         💰    │ ← TopAppBar:
│                                 │   Height: 64dp
├─────────────────────────────────┤   Background: #FFFFFF
│ Background: #F5F5F5             │   Elevation: 4dp
│                                 │   Icons: #424242
│ ┌─────────────────────────────┐ │
│ │       Upload Photos         │ │ ← Card Component:
│ │                             │ │   Background: White
│ │   Select 3-10 photos for    │ │   Corner radius: 12dp
│ │   AI analysis and           │ │   Elevation: 2dp
│ │   optimization              │ │   Padding: 16dp
│ │                             │ │   Typography: Roboto
│ └─────────────────────────────┘ │   Title: 22sp Medium
│                                 │   Body: 16sp Regular
│   Photo Grid Layout:            │
│                                 │
│ ┌───┬───┬───┬───┬───┐          │ ← Photo thumbnails:
│ │📷 │📷 │📷 │ + │ + │          │   Size: 100dp x 120dp
│ │ ✓ │ ✓ │ ✓ │   │   │          │   Corner radius: 8dp
│ └───┴───┴───┴───┴───┘          │   Spacing: 8dp between
│ ┌───┬───┬───┬───┬───┐          │   Selected: Green checkmark
│ │ + │ + │ + │ + │ + │          │   Add button: Dashed border
│ │   │   │   │   │   │          │   Border color: #E91E63
│ └───┴───┴───┴───┴───┘          │   Background: White
│                                 │   Icon: + symbol in pink
│      3/10 photos selected       │ ← Counter: Roboto 16sp, #666
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 💡 Include mix of close-ups,│ │ ← Tip Card:
│ │    full body, and activities│ │   Background: #FFF8E1
│ │                             │ │   Border-left: 4dp #FF9800
│ └─────────────────────────────┘ │   Padding: 12dp
│                                 │   Typography: 14sp Italic
│                                 │
│ ┌─────────────────────────────┐ │
│ │    CONTINUE TO ANALYSIS     │ │ ← Primary Button:
│ │                             │ │   Background: #E91E63
│ └─────────────────────────────┘ │   Height: 48dp, Corner: 8dp
│                                 │   Text: White, Roboto Medium 16sp
│                                 │   Disabled state: 50% opacity
├─────────────────────────────────┤
│  📸    📊    ✍️    💎         │ ← Bottom Navigation:
│Upload Analysis Bio  Premium     │   Height: 80dp
└─────────────────────────────────┘   Icons: 24dp Material Icons
                                     Active: #E91E63
                                     Inactive: #9E9E9E

State Management:
- Upload progress: Linear progress indicator below header
- Photo selection: Material Design selection state
- Loading: Skeleton placeholders for photo grid
- Error states: Snackbar notifications
```

---

## Mockup 3: Photo Analysis Results
```
Visual Design Specifications:

Content: Scrollable list with Material Design cards

┌─────────────────────────────────┐
│ ←    Analysis Results      📤   │ ← Navigation: Material back arrow
├─────────────────────────────────┤   Share: Material share icon
│ Background: #F5F5F5             │   TopAppBar styling consistent
│                                 │
│ ┌─────────────────────────────┐ │
│ │      Your Photo Scores      │ │ ← Header Card:
│ │                             │ │   Same styling as previous
│ │  AI has analyzed your       │ │   Typography hierarchy
│ │  photos for dating success  │ │   maintained throughout
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [Photo thumbnail] 94/100 ⭐ │ │ ← Photo Result Card:
│ │                             │ │   Layout: Row with image left
│ │ BEST - Great smile, good    │ │   Image: 60dp x 72dp rounded
│ │ lighting and composition    │ │   Score: Large bold number
│ │                             │ │   Badge: "BEST" chip in green
│ │ [───────────────────] 94%   │ │   Progress bar: Material linear
│ │                             │ │   Color: Success green gradient
│ │        [View Details]       │ │   Button: Text button style
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [Photo thumbnail] 87/100    │ │ ← Second Photo Card:
│ │                             │ │   Same layout structure
│ │ Nice composition, crop      │ │   Different score color
│ │ closer for better impact    │ │   Orange/yellow for medium
│ │                             │ │   scores (70-89 range)
│ │ [───────────────────] 87%   │ │
│ │                             │ │
│ │        [View Details]       │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [Photo thumbnail] 76/100    │ │ ← Lower Scoring Photo:
│ │                             │ │   Red/orange for low scores
│ │ Dark lighting, try          │ │   Remove option available
│ │ brighter background         │ │   Layout consistent but
│ │                             │ │   warning color scheme
│ │ [───────────────────] 76%   │ │
│ │                             │ │
│ │ [View Details] [❌ Remove]   │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │    📊 Overall Profile       │ │ ← Summary Card:
│ │         Score               │ │   Centered content
│ │                             │ │   Large score display
│ │        85/100               │ │   Color based on score
│ │                             │ │   Green for 80+ scores
│ │  [██████████████████──] 85% │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │       GENERATE BIO          │ │ ← FAB-style primary button
│ └─────────────────────────────┘ │   Full width at bottom

Micro-interactions:
- Photo cards: Subtle scale animation on tap
- Progress bars: Animated fill from 0 to final score
- Score numbers: Count-up animation
- Remove button: Swipe-to-reveal gesture support
- Share button: Native Android share sheet integration
```

---

## Mockup 4: Bio Generation Interface
```
Visual Design Specifications:

Layout: Scrollable content with radio button selection

┌─────────────────────────────────┐
│ ←        Choose Your Bio        │
├─────────────────────────────────┤
│ Background: #F5F5F5             │
│                                 │
│ ┌─────────────────────────────┐ │
│ │    Your Personalized Bios   │ │ ← Header card styling
│ │                             │ │   consistent with app
│ │  AI-generated based on your │ │
│ │  personality and photos     │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ● Professional  Match: 92%  │ │ ← Bio Selection Card:
│ │                       [🔄] │ │   Radio button: Material 3
│ │ ─────────────────────────── │ │   Color: #E91E63 when selected
│ │                             │ │   Match percentage: Bold
│ │ "Software engineer by day,  │ │   Refresh icon: 20dp
│ │ adventure seeker by weekend.│ │   Bio text: Roboto 16sp
│ │ I can debug your code and   │ │   Line height: 24sp
│ │ find the best hiking        │ │   Color: #212121
│ │ trails. Looking for someone │ │   
│ │ who appreciates good coffee │ │   Card styling:
│ │ and spontaneous road trips. │ │   - Background: White
│ │ Let's build something       │ │   - Corner radius: 12dp
│ │ amazing together! 🚀"       │ │   - Elevation: 1dp
│ │                             │ │   - Padding: 16dp
│ │ 156 characters ✨Recommended│ │   - Margin: 8dp vertical
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ○ Casual & Fun   Match: 88% │ │ ← Unselected Bio Card:
│ │                       [🔄] │ │   Radio button: Outline only
│ │ ─────────────────────────── │ │   Same styling but muted
│ │                             │ │   when not selected
│ │ "Just a guy who loves good  │ │
│ │ food, great music, and even │ │
│ │ better conversations. I make│ │
│ │ a mean pasta and terrible   │ │
│ │ dad jokes. If you're into   │ │
│ │ authentic connections and   │ │
│ │ laughing until your cheeks  │ │
│ │ hurt, swipe right! 😄"      │ │
│ │                             │ │
│ │ 142 characters              │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │      Regenerations: 1/3     │ │ ← Usage Counter Card:
│ │                             │ │   Background: #FFF3E0
│ │ Need more? Upgrade to       │ │   Text color: #E65100
│ │ Premium for unlimited!      │ │   Border: 1dp #FFB74D
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │    CONTINUE WITH BIO        │ │ ← Primary action button
│ └─────────────────────────────┘ │   Enabled only when selected

Interaction States:
- Selection: Material Design radio button animation
- Regeneration: Loading spinner replaces refresh icon
- Character count: Color changes based on platform limits
- Scroll behavior: Cards snap into view for better readability
- Premium upsell: Subtle highlight animation on limit reached
```

---

## Mockup 5: Final Optimized Profile
```
Visual Design Specifications:

Layout: Success-focused with clear export options

┌─────────────────────────────────┐
│ ←   Your Optimized Profile  📤  │
├─────────────────────────────────┤
│ Background: Linear gradient     │
│ #E8F5E8 to #F5F5F5 (success)   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │        🎉 Complete!         │ │ ← Success Header:
│ │                             │ │   Background: White with
│ │  Your optimized profile is  │ │   subtle success green tint
│ │      ready to use!          │ │   Icon: 32dp celebration
│ └─────────────────────────────┘ │   Typography: Large title
│                                 │
│ ┌─────────────────────────────┐ │
│ │                             │ │ ← Profile Preview Card:
│ │    [Primary Photo Large]    │ │   Main photo: 200dp x 250dp
│ │                             │ │   Corner radius: 16dp
│ │                             │ │   Shadow: elevated look
│ │ "Software engineer by day,  │ │   Bio text: Roboto 16sp
│ │ adventure seeker by weekend.│ │   Line spacing: 24sp
│ │ I can debug your code and   │ │   Padding: 16dp
│ │ find the best hiking        │ │
│ │ trails..."                  │ │
│ │                             │ │
│ │ [📷][📷][📷] +3 more        │ │ ← Secondary photos:
│ └─────────────────────────────┘ │   Size: 60dp x 72dp
│                                 │   Corner radius: 8dp
│ ┌─────────────────────────────┐ │   Spacing: 4dp between
│ │   📊 Predicted Performance  │ │
│ │                             │ │ ← Metrics Card:
│ │ Profile Attractiveness: 85% │ │   Background: #E3F2FD
│ │ Expected Match Increase:    │ │   Icon color: #1976D2
│ │         +300% 📈           │ │   Typography: Medium weight
│ │ Bio Personality Match: 92%  │ │   Numbers: Bold, larger size
│ └─────────────────────────────┘ │
│                                 │
│ Export Options:                 │ ← Section header
│                                 │   Roboto Medium 18sp
│ ┌─────────────────────────────┐ │
│ │ 📱 [Tinder Logo] Export to  │ │ ← Platform Export Cards:
│ │     Tinder                  │ │   Height: 56dp each
│ │                        →    │ │   Background: White
│ └─────────────────────────────┘ │   Left: Platform logo + text
│ ┌─────────────────────────────┐ │   Right: Arrow indicator
│ │ 🐝 [Bumble Logo] Export to  │ │   Border: 1dp platform color
│ │     Bumble                  │ │   Hover: Platform brand color
│ │                        →    │ │   tint on background
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 💖 [Hinge Logo] Export to   │ │
│ │     Hinge                   │ │
│ │                        →    │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 📁 Save Photos to Gallery   │ │ ← Generic save option
│ │                        →    │ │   Material folder icon
│ └─────────────────────────────┘ │

Animation & Interactions:
- Success confetti: Particle animation on screen entry
- Performance metrics: Count-up animation for numbers
- Export buttons: Ripple effect with platform brand colors
- Photo preview: Tap to expand in full-screen gallery
- Share functionality: Native Android share sheet integration
```

---

## Color Psychology & Branding:

### Primary Pink (#E91E63):
- **Psychology**: Playful, romantic, confident, energetic
- **Usage**: Primary actions, active states, brand moments
- **Accessibility**: AA compliant contrast ratios maintained

### Secondary Colors:
- **Success Green** (#4CAF50): Achievements, positive metrics
- **Warning Orange** (#FF9800): Tips, improvements needed  
- **Error Red** (#F44336): Issues, removal actions
- **Info Blue** (#2196F3): Informational content, links

### Material Design 3 Implementation:
- **Dynamic Color**: Support for Material You theming
- **Elevation**: Proper shadow and surface treatment
- **Typography**: Roboto font family with proper scale
- **Components**: Native Material Design 3 components
- **Accessibility**: High contrast support, large text scaling

### Android-Specific Optimizations:
- **Navigation**: Software back button support
- **Gestures**: Swipe gestures for card interactions
- **Notifications**: Proper notification styling and behavior
- **Permissions**: Camera and storage permission flows
- **Share Integration**: Native Android sharing functionality
- **App Shortcuts**: Dynamic shortcuts for quick actions