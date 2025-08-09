# LinkedIn Headshot Generator - Design System
*iOS-focused Human Interface Guidelines*

## Brand Identity
**Mission**: Create professional headshots that enhance career opportunities
**Values**: Professional, Trustworthy, Sophisticated, Reliable, Quality-driven
**Personality**: Polished, confident, approachable, expert, premium

## Color Palette

### Primary Colors
- **Professional Blue**: #0A66C2 (LinkedIn Brand Blue)
  - Light: #CCE7FF
  - Dark: #004182
  - On Primary: #FFFFFF

- **Trust Navy**: #1B365D (Deep Professional)
  - Light: #E8F4FD
  - Dark: #0F1419
  - On Navy: #FFFFFF

### Secondary Colors
- **Premium Gold**: #F5B800 (Accent for premium features)
  - Light: #FFF8CC
  - Dark: #B8860B
  - On Gold: #000000

- **Success Teal**: #057642 (Professional success)
  - Light: #D4F5E5
  - Dark: #034A2A
  - On Teal: #FFFFFF

### Semantic Colors
- **Success**: #34C759 (iOS Green)
- **Warning**: #FF9500 (iOS Orange)
- **Error**: #FF3B30 (iOS Red)
- **Info**: #007AFF (iOS Blue)

### Neutral Colors
- **White**: #FFFFFF
- **Background**: #F2F2F7 (iOS System Background)
- **Secondary Background**: #FFFFFF
- **Grouped Background**: #F2F2F7
- **Label**: #000000
- **Secondary Label**: #3C3C43 (60% opacity)
- **Tertiary Label**: #3C3C43 (30% opacity)
- **Separator**: #C6C6C8

## Typography

### Font Family
**Primary**: SF Pro Display (iOS system font)
**Secondary**: SF Pro Text (for body text)
**Monospace**: SF Mono (for code/technical text)

### iOS Type Scale
- **Large Title**: 34pt, SF Pro Display Regular, Line Height 41pt
- **Title 1**: 28pt, SF Pro Display Regular, Line Height 34pt
- **Title 2**: 22pt, SF Pro Display Regular, Line Height 28pt
- **Title 3**: 20pt, SF Pro Display Regular, Line Height 25pt
- **Headline**: 17pt, SF Pro Text Semibold, Line Height 22pt
- **Body**: 17pt, SF Pro Text Regular, Line Height 22pt
- **Callout**: 16pt, SF Pro Text Regular, Line Height 21pt
- **Subheadline**: 15pt, SF Pro Text Regular, Line Height 20pt
- **Footnote**: 13pt, SF Pro Text Regular, Line Height 18pt
- **Caption 1**: 12pt, SF Pro Text Regular, Line Height 16pt
- **Caption 2**: 11pt, SF Pro Text Regular, Line Height 13pt

## Spacing System

### iOS Grid System
- **Base Unit**: 8pt
- **Component Spacing**: 16pt, 20pt, 24pt, 32pt
- **Screen Margins**: 16pt (iPhone), 20pt (iPad)

### Spacing Scale
- **Micro**: 2pt
- **XS**: 4pt
- **S**: 8pt
- **M**: 16pt
- **L**: 20pt
- **XL**: 24pt
- **XXL**: 32pt
- **Huge**: 44pt

## Iconography

### Style
- **System**: SF Symbols (iOS native)
- **Weight**: Medium (default), Light/Bold for emphasis
- **Sizes**: 17pt (small), 22pt (medium), 28pt (large)

### Key Icons
- **Camera**: camera.fill
- **Photos**: photo.stack
- **AI/Magic**: wand.and.stars
- **Professional**: briefcase.fill
- **Success**: checkmark.circle.fill
- **Share**: square.and.arrow.up
- **Settings**: gear
- **Profile**: person.circle.fill
- **Star**: star.fill
- **Download**: arrow.down.circle.fill

## Layout & Navigation

### Navigation Bar
- **Height**: 44pt (compact), 96pt (regular with large title)
- **Title Typography**: Headline (17pt Semibold)
- **Button Spacing**: 16pt from edges
- **Translucent**: Yes (with blur effect)

### Tab Bar
- **Height**: 49pt + safe area
- **Icon Size**: 22pt
- **Typography**: Caption 2 (11pt)
- **Active Color**: Professional Blue
- **Inactive Color**: Secondary Label

### Safe Areas
- **Respect all safe area insets**
- **Top**: Status bar + navigation
- **Bottom**: Home indicator + tab bar
- **Sides**: Notch/Dynamic Island considerations

## Corner Radius & Borders

### Radius Scale
- **Small**: 8pt (buttons, tags)
- **Medium**: 12pt (cards, images)
- **Large**: 16pt (modals, containers)
- **Continuous**: Use continuous corner radius for iOS feel

### Border Styles
- **Thin**: 0.5pt (separators)
- **Standard**: 1pt (buttons, cards)
- **Thick**: 2pt (focus states)

## Animation & Motion

### iOS Standard Durations
- **Quick**: 0.2s (button press)
- **Standard**: 0.3s (view transitions)
- **Slow**: 0.5s (complex animations)

### Easing Curves
- **Ease In Out**: Default iOS animation curve
- **Spring**: For interactive elements
- **Linear**: For progress indicators

### Transition Types
- **Push/Pop**: Navigation stack
- **Present/Dismiss**: Modal presentation
- **Fade**: Content changes
- **Scale**: Photo zoom interactions

## Component Specifications

### Buttons
- **Height**: 44pt minimum (touch target)
- **Padding**: 16pt horizontal, 11pt vertical
- **Corner Radius**: 8pt
- **Typography**: Headline (17pt Semibold)
- **Primary**: Professional Blue background
- **Secondary**: Clear background with Professional Blue text

### Cards
- **Corner Radius**: 12pt (continuous)
- **Shadow**: 0pt 2pt 10pt rgba(0,0,0,0.1)
- **Padding**: 16pt
- **Background**: White or Secondary Background

### Navigation Lists
- **Row Height**: 44pt minimum
- **Separator**: Full width, Separator color
- **Disclosure**: chevron.right (13pt)
- **Typography**: Body (17pt)

### Progress Indicators
- **Activity**: iOS native spinner
- **Progress Bar**: 4pt height, rounded ends
- **Step Indicator**: Dots or numbers with connecting lines

## Professional Photography Guidelines

### Image Specifications
- **Aspect Ratio**: 1:1 (square), 4:5 (portrait)
- **Resolution**: 1024x1024px minimum for processing
- **Format**: HEIC (iOS native), JPEG for sharing
- **Compression**: High quality (0.8-0.9)

### Photo Display
- **Corner Radius**: 12pt (continuous)
- **Shadow**: Subtle drop shadow for depth
- **Loading State**: Skeleton with shimmer effect
- **Error State**: Placeholder with reload option

### Style Previews
- **Grid**: 2-3 columns on iPhone, 3-4 on iPad
- **Thumbnail Size**: 120pt x 150pt
- **Selection State**: Blue border (2pt) with checkmark overlay

## Accessibility

### iOS Accessibility Guidelines
- **VoiceOver**: Full support with descriptive labels
- **Dynamic Type**: Support all text size categories
- **High Contrast**: Alternative color schemes
- **Reduce Motion**: Respect user preference

### Color Contrast
- **AA Standard**: 4.5:1 for normal text
- **AAA Enhanced**: 7:1 for important text
- **UI Elements**: 3:1 minimum contrast

### Touch Targets
- **Minimum**: 44pt x 44pt
- **Recommended**: 48pt x 48pt for primary actions
- **Spacing**: 8pt minimum between targets

## Dark Mode Support

### Semantic Colors (Dark Mode)
- **Background**: #000000 (Pure black)
- **Secondary Background**: #1C1C1E
- **Grouped Background**: #000000
- **Label**: #FFFFFF
- **Secondary Label**: #EBEBF5 (60% opacity)
- **Professional Blue**: #409CFF (lighter for contrast)

### Adaptation Strategy
- **Elevate surfaces with darker grays**
- **Increase contrast for text**
- **Maintain brand recognition**
- **Test all states thoroughly**

## Responsive Design

### Device Support
- **iPhone SE**: 320pt width (minimum)
- **iPhone Standard**: 375pt - 390pt width
- **iPhone Plus/Pro Max**: 414pt - 430pt width
- **iPad**: 768pt - 1024pt width

### Layout Adaptations
- **iPhone**: Single column, full-width components
- **iPhone Plus**: Slight padding increases
- **iPad**: Two-column layouts, expanded touch targets

## Professional UI Patterns

### Onboarding
- **Style**: Card-based with progress indicator
- **Navigation**: Continue/Skip buttons
- **Imagery**: Professional illustrations
- **Copy**: Clear, benefit-focused

### Style Selection
- **Display**: Grid with large previews
- **Selection**: Single-select with visual feedback
- **Preview**: Before/after comparison
- **Information**: Style name and description

### Processing States
- **Progress**: Circular progress with percentage
- **Messaging**: Clear status updates
- **Cancellation**: Option to cancel processing
- **Error Handling**: Retry mechanisms

### Results Gallery
- **Layout**: Full-screen photo viewer
- **Navigation**: Swipe gestures
- **Actions**: Download, share, favorite
- **Comparison**: Side-by-side original/processed

## Premium Features UI

### Subscription Tiers
- **Visual Hierarchy**: Cards with clear differentiation
- **Pricing**: Prominent display with value proposition
- **Features**: Checkmark lists with icons
- **CTA**: Single prominent upgrade button

### Payment Flow
- **Native**: Use StoreKit for iOS
- **Security**: Show security badges
- **Confirmation**: Clear purchase confirmation
- **Management**: Link to App Store subscriptions

## Usage Guidelines

### Do's
- Follow iOS Human Interface Guidelines strictly
- Use system fonts and colors when appropriate
- Implement proper navigation patterns
- Support all iOS accessibility features
- Maintain consistent spacing and typography
- Test on multiple device sizes
- Support both light and dark modes

### Don'ts
- Use Android-specific patterns
- Ignore safe area insets
- Create non-standard navigation
- Compromise on accessibility
- Use non-iOS standard animations
- Mix design systems inconsistently

## Implementation Notes

### iOS Specific
- **Use native iOS components** when possible
- **Implement proper memory management** for photo processing
- **Support iOS sharing sheet** for photo export
- **Integrate with Photos app** for seamless experience
- **Use Core Image** for professional photo processing
- **Implement proper app lifecycle** handling

### Performance Considerations
- **Lazy load** photo thumbnails and previews
- **Implement proper caching** for processed images
- **Use background processing** for AI operations
- **Monitor memory usage** during photo manipulation
- **Optimize for battery life** during intensive processing

### Privacy & Security
- **Request proper permissions** for camera and photos
- **Implement secure upload/download**
- **Clear privacy messaging** about data usage
- **Provide data deletion options**
- **Follow iOS privacy guidelines** strictly