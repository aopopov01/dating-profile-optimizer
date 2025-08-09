# Dating Profile Optimizer - Component Specifications
*Comprehensive component library for Android Material Design 3*

## Component Architecture Overview

```
COMPONENT SYSTEM PRINCIPLES:
1. Material Design 3 compliance and consistency
2. Accessibility-first design approach
3. Responsive across Android device sizes
4. Dating app specific user experience patterns
5. Conversion optimization built into components
6. Dark mode and Dynamic Color support
```

---

## Core UI Components

### 1. Buttons

#### Primary Button (DPOPrimaryButton)
```
SPECIFICATIONS:
- Height: 48dp (minimum touch target)
- Corner radius: 8dp
- Typography: Roboto Medium 16sp
- Padding: 16dp horizontal, 12dp vertical
- Elevation: 2dp
- Background: Linear gradient #E91E63 to #C2185B
- Text color: #FFFFFF
- Ripple effect: White with 20% opacity
- Disabled state: 38% opacity
- Focus state: 2dp outline in #E91E63

STATES:
- Default: Full pink gradient with white text
- Pressed: Scale to 0.98x with darker pink gradient
- Disabled: 38% opacity with no interaction
- Loading: Spinner replaces text, maintains button dimensions
- Focus: Accessibility outline for keyboard navigation

USAGE:
- Primary CTAs (Continue, Upload, Generate)
- Payment and upgrade actions
- Profile completion steps
- Export and sharing actions

CODE EXAMPLE:
<DPOPrimaryButton
  text="Continue to Analysis"
  onPress={handleContinue}
  loading={isAnalyzing}
  disabled={photos.length === 0}
  icon="arrow-right"
/>
```

#### Secondary Button (DPOSecondaryButton)
```
SPECIFICATIONS:
- Height: 48dp
- Corner radius: 8dp
- Typography: Roboto Medium 16sp
- Padding: 16dp horizontal, 12dp vertical
- Background: Transparent
- Border: 1dp solid #E91E63
- Text color: #E91E63
- Ripple effect: Pink with 12% opacity

STATES:
- Default: Outlined pink border with pink text
- Pressed: Pink background with white text
- Disabled: Grey border and text
- Loading: Pink spinner with original text color

USAGE:
- Secondary actions (Skip, Maybe Later)
- Alternative choices (Try Different Style)
- Cancellation actions (Cancel Process)
- Back navigation alternatives
```

#### Text Button (DPOTextButton)
```
SPECIFICATIONS:
- Height: 40dp (minimum)
- Corner radius: 4dp
- Typography: Roboto Medium 14sp
- Padding: 12dp horizontal, 8dp vertical
- Background: Transparent
- Text color: #E91E63
- Ripple effect: Pink with 12% opacity
- Underline on focus for accessibility

USAGE:
- Navigation links (Sign In, Terms of Service)
- Less important actions (Skip Tour)
- Footer links and help options
- Social proof links (See Success Stories)
```

---

### 2. Cards

#### Feature Card (DPOFeatureCard)
```
SPECIFICATIONS:
- Background: #FFFFFF
- Corner radius: 12dp
- Elevation: 2dp (4dp on hover)
- Padding: 16dp
- Margin: 8dp horizontal, 4dp vertical
- Shadow: 0dp 2dp 8dp rgba(0,0,0,0.1)
- Border: None (elevation provides definition)

CONTENT STRUCTURE:
- Icon: 24dp Material icon in #E91E63
- Title: Roboto Medium 18sp, #212121
- Description: Roboto Regular 14sp, #616161
- Optional action button or link

INTERACTIVE STATES:
- Rest: Standard elevation and colors
- Hover: Increase elevation to 4dp
- Pressed: Brief scale animation to 0.98x
- Focus: 2dp outline for accessibility

USAGE:
- Feature explanations in onboarding
- Benefit displays in premium upgrade
- Success story presentations
- Photo analysis result cards

RESPONSIVE BEHAVIOR:
- Stacks vertically on narrow screens
- 2-column grid on tablets
- Maintains minimum touch target of 48dp
```

#### Photo Card (DPOPhotoCard)
```
SPECIFICATIONS:
- Aspect ratio: 4:5 (dating app standard)
- Corner radius: 8dp
- Background: #F5F5F5 (placeholder)
- Elevation: 1dp (3dp on selection)
- Selection indicator: 2dp #4CAF50 border
- Remove button: 24dp circular, #F44336 background
- Loading state: Skeleton animation

PHOTO DISPLAY:
- Image fit: Cover (maintains aspect ratio)
- Loading placeholder: Grey with shimmer animation
- Error state: Icon with retry option
- Quality indicator: Green/yellow/red dot overlay

INTERACTION STATES:
- Unselected: Standard appearance
- Selected: Green border and checkmark overlay
- Uploading: Progress indicator overlay
- Error: Red border with error icon
- Hover: Slight scale increase (1.02x)

ACCESSIBILITY:
- Alt text for screen readers
- Focus indicators for keyboard navigation
- Semantic labels for selection state
- High contrast support
```

---

### 3. Form Components

#### Text Input (DPOTextInput)
```
SPECIFICATIONS:
- Height: 56dp
- Corner radius: 4dp (top corners only)
- Background: #FFFFFF
- Border: 1dp #E0E0E0 (bottom only)
- Padding: 16dp horizontal, 14dp vertical
- Typography: Roboto Regular 16sp
- Label: Roboto Medium 12sp, #616161
- Focus border: 2dp #E91E63

STATES:
- Rest: Light grey bottom border
- Focus: Pink border with floating label animation
- Error: Red border with error message below
- Disabled: Grey background with reduced opacity
- Success: Green accent with checkmark icon

LABEL BEHAVIOR:
- Placeholder transforms to floating label on focus
- Remains floating when field has content
- Error messages appear below field
- Character count displays for limited fields

ACCESSIBILITY:
- Proper ARIA labels and descriptions
- Error messages associated with field
- Focus management for form navigation
- Support for accessibility services
```

#### Selection Input (DPOSelectionInput)
```
SPECIFICATIONS:
- Height: 56dp minimum
- Background: #FFFFFF
- Border: 1dp #E0E0E0
- Corner radius: 8dp
- Padding: 16dp
- Dropdown icon: 24dp Material icon
- Typography: Roboto Regular 16sp

DROPDOWN BEHAVIOR:
- Modal bottom sheet on mobile
- Overlay dropdown on tablets
- Search functionality for long lists
- Multi-select with chip display
- Single-select with radio buttons

CHIP DISPLAY (for multi-select):
- Height: 32dp
- Corner radius: 16dp
- Background: #E91E63 with 12% opacity
- Text color: #E91E63
- Remove icon: 16dp
- Spacing: 4dp between chips
```

---

### 4. Navigation Components

#### Bottom Navigation (DPOBottomNavigation)
```
SPECIFICATIONS:
- Height: 80dp (includes safe area)
- Background: #FFFFFF
- Elevation: 8dp
- Item count: 4 main sections
- Active indicator: #E91E63
- Inactive color: #9E9E9E

TAB SPECIFICATIONS:
- Icon size: 24dp Material icons
- Label typography: Roboto Medium 12sp
- Active state: Pink icon and label
- Inactive state: Grey icon and label
- Spacing: Equal distribution across width
- Ripple effect on tap

TABS STRUCTURE:
1. Upload (photo_camera icon)
2. Analysis (analytics icon)  
3. Bio (edit_note icon)
4. Premium (diamond icon)

BEHAVIOR:
- Persistent across main app sections
- Badge indicators for notifications
- Haptic feedback on selection
- Smooth transition animations
```

#### Top App Bar (DPOTopAppBar)
```
SPECIFICATIONS:
- Height: 64dp (including status bar)
- Background: #FFFFFF or surface color
- Elevation: 4dp when scrolled
- Title typography: Roboto Medium 20sp
- Action icon size: 24dp
- Navigation icon: 24dp back arrow

LAYOUT:
- Navigation icon: 16dp from leading edge
- Title: 72dp from leading edge (with nav icon)
- Action icons: 16dp from trailing edge
- Vertical centering of all elements

SCROLL BEHAVIOR:
- Elevated appearance when content scrolls
- Title can collapse to small title
- Action icons remain visible
- Background blur on supported devices

ACCESSIBILITY:
- Navigation announcements for screen readers
- Touch targets minimum 48dp
- High contrast support
- Focus indicators
```

---

### 5. Progress Indicators

#### Progress Ring (DPOProgressRing)
```
SPECIFICATIONS:
- Size: 120dp diameter for primary, 48dp for secondary
- Stroke width: 8dp for primary, 4dp for secondary
- Track color: #E0E0E0
- Progress color: Linear gradient #E91E63 to #C2185B
- Animation: Smooth arc progress with spring physics
- Text overlay: Roboto Bold for percentage

ANIMATION BEHAVIOR:
- Progress animates from 0 to target value
- Duration: 1000ms with ease-out curve
- Micro-animations for small progress changes
- Completion celebration animation
- Loading state with indeterminate rotation

USAGE:
- Photo analysis progress
- Bio generation progress
- Profile completion percentage
- Success metric displays
```

#### Linear Progress (DPOLinearProgress)
```
SPECIFICATIONS:
- Height: 4dp
- Corner radius: 2dp
- Track color: #E0E0E0
- Progress color: #E91E63
- Indeterminate animation: Moving gradient
- Buffer indicator for multi-stage processes

STATES:
- Determinate: Shows specific progress percentage
- Indeterminate: Continuous loading animation
- Buffer: Shows loaded vs. playing progress
- Error: Red color with error indication

IMPLEMENTATION:
- Full-width by default
- Can be contained within cards
- Supports multiple progress tracks
- Smooth animation between states
```

---

### 6. Content Display

#### Success Metrics (DPOSuccessMetrics)
```
SPECIFICATIONS:
- Layout: Horizontal row or vertical stack
- Background: Success green tint (#E8F5E8)
- Border: 1dp #4CAF50 on left edge
- Corner radius: 8dp
- Padding: 16dp
- Icon: 24dp trending_up in #4CAF50

CONTENT STRUCTURE:
- Metric value: Roboto Bold 24sp, #2E7D32
- Metric label: Roboto Medium 14sp, #4A5D23
- Percentage change: Roboto Medium 16sp with +/- symbol
- Comparison period: Roboto Regular 12sp, #666666

ANIMATION:
- Count-up animation for metric values
- Entrance animation with slide + fade
- Hover state with slight scale increase
- Success celebration for achievements

USAGE:
- Match rate improvements
- Profile score displays
- Before/after comparisons
- Premium feature benefits
```

#### Testimonial Card (DPOTestimonialCard)
```
SPECIFICATIONS:
- Background: #FFFFFF
- Corner radius: 12dp
- Elevation: 2dp
- Padding: 20dp
- Quote marks: 32dp #E91E63 icon
- Avatar: 48dp circular image
- Rating stars: 16dp gold stars

CONTENT LAYOUT:
- Quote text: Roboto Regular 16sp, #212121
- User name: Roboto Medium 14sp, #E91E63
- User details: Roboto Regular 12sp, #666666
- Star rating: 5-star display with filled/unfilled states

CAROUSEL BEHAVIOR:
- Horizontal scrolling on mobile
- Auto-advance with pause on interaction
- Pagination indicators
- Swipe gestures for navigation

SOCIAL PROOF ELEMENTS:
- Verified user badges
- Location information
- Age demographic
- Success timeframe
```

---

### 7. Interactive Elements

#### Photo Upload Zone (DPOPhotoUploadZone)
```
SPECIFICATIONS:
- Minimum height: 200dp
- Background: #FAFAFA with dashed border
- Border: 2dp dashed #E91E63
- Corner radius: 12dp
- Padding: 24dp
- Icon: 48dp cloud_upload in #E91E63

STATES:
- Empty: Dashed border with upload instructions
- Drag over: Solid border with highlighted background
- Uploading: Progress indicator with file names
- Complete: Success state with uploaded file preview
- Error: Red border with error message

INTERACTION:
- Click/tap to open file picker
- Drag and drop support (where available)
- Multiple file selection
- File type validation
- Size limit enforcement

ACCESSIBILITY:
- Screen reader announcements
- Keyboard navigation support
- Focus indicators
- Error message association
```

#### Bio Selection (DPOBioSelection)
```
SPECIFICATIONS:
- Card layout with radio button selection
- Background: #FFFFFF
- Corner radius: 12dp
- Elevation: 1dp (3dp when selected)
- Padding: 16dp
- Selection indicator: 2dp #E91E63 border

CONTENT STRUCTURE:
- Bio style label: Roboto Medium 16sp, #E91E63
- Match percentage: Roboto Bold 14sp, #4CAF50
- Bio text: Roboto Regular 16sp, #212121
- Character count: Roboto Regular 12sp, #666666
- Regenerate button: 32dp icon button

INTERACTION:
- Radio button selection with animation
- Tap anywhere on card to select
- Regenerate button with loading state
- Swipe to dismiss or mark as favorite
- Long press for additional options

PLATFORM OPTIMIZATION:
- Tinder: Character limit indicator
- Bumble: Conversation starter emphasis
- Hinge: Prompt response formatting
- Match.com: Detailed description support
```

---

## Component Usage Guidelines

### Accessibility Standards
```
ACCESSIBILITY COMPLIANCE:
1. WCAG 2.1 AA compliance minimum
2. Color contrast ratio 4.5:1 for normal text
3. Touch targets minimum 48dp
4. Focus indicators clearly visible
5. Screen reader support with proper labels
6. Keyboard navigation support
7. High contrast mode compatibility
8. Dynamic type support for text scaling

IMPLEMENTATION:
- Use semantic HTML/React Native accessibility props
- Provide alternative text for images
- Associate labels with form controls
- Announce state changes to screen readers
- Support voice control commands
- Test with accessibility scanning tools
```

### Responsive Behavior
```
BREAKPOINT SYSTEM:
- Small phones: 320dp - 360dp width
- Standard phones: 360dp - 480dp width  
- Large phones: 480dp - 600dp width
- Small tablets: 600dp - 840dp width
- Large tablets: 840dp+ width

COMPONENT ADAPTATIONS:
- Cards: Single column → multi-column grid
- Navigation: Bottom tabs → side navigation
- Forms: Stacked → side-by-side fields
- Images: Full width → constrained with padding
- Typography: Scale adjustments for readability

TOUCH TARGET ADJUSTMENTS:
- Minimum 48dp on all devices
- Increase to 56dp on large screens
- Spacing adjustments for finger navigation
- Hover states on devices with cursor support
```

### Performance Optimizations
```
RENDERING PERFORMANCE:
1. Lazy loading for images and heavy components
2. Virtual scrolling for long lists
3. Skeleton screens during loading states
4. Image optimization with multiple formats
5. Component memoization to prevent re-renders
6. Bundle splitting for code efficiency

ANIMATION PERFORMANCE:
1. Use transform properties for animations
2. Avoid animating layout-triggering properties
3. 60fps target for all animations
4. Respect user motion preferences
5. Debounce frequent interactions
6. Hardware acceleration where appropriate

MEMORY MANAGEMENT:
1. Cleanup event listeners and subscriptions
2. Optimize image loading and caching
3. Implement efficient state management
4. Remove unused components from DOM
5. Monitor memory usage patterns
6. Implement garbage collection best practices
```

### Component Documentation
```
DOCUMENTATION REQUIREMENTS:
1. Component API documentation with TypeScript types
2. Usage examples with code snippets
3. Design specifications and measurements
4. Accessibility guidelines and testing
5. Performance considerations and optimizations
6. Browser/device compatibility notes

DEVELOPMENT WORKFLOW:
1. Design system updates trigger component reviews
2. A/B testing integration for optimization
3. Analytics tracking for user interactions
4. Error boundary implementation
5. Storybook documentation for all components
6. Automated testing for functionality and accessibility
```

This component specification provides a comprehensive foundation for implementing a consistent, accessible, and conversion-optimized dating app interface that follows Material Design 3 principles while maintaining brand identity and user experience goals.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "1", "content": "Create Dating Profile Optimizer design system documentation", "status": "completed"}, {"id": "2", "content": "Create LinkedIn Headshot Generator design system documentation", "status": "completed"}, {"id": "3", "content": "Design Dating Profile Optimizer wireframes for all key screens", "status": "completed"}, {"id": "4", "content": "Design LinkedIn Headshot Generator wireframes for all key screens", "status": "completed"}, {"id": "5", "content": "Create high-fidelity mockups for Dating Profile Optimizer", "status": "completed"}, {"id": "6", "content": "Create high-fidelity mockups for LinkedIn Headshot Generator", "status": "completed"}, {"id": "7", "content": "Design user journey flows for both apps", "status": "completed"}, {"id": "8", "content": "Create onboarding flow designs for both apps", "status": "completed"}, {"id": "9", "content": "Design payment screen layouts for both apps", "status": "completed"}, {"id": "10", "content": "Create component specifications documentation", "status": "completed"}]