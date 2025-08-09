# Dating Profile Optimizer - Design System
*Android-focused Material Design 3*

## Brand Identity
**Mission**: Transform dating success through AI-powered profile optimization
**Values**: Fun, Authentic, Transformative, Approachable, Results-driven
**Personality**: Warm, encouraging, confident, playful

## Color Palette

### Primary Colors
- **Primary Pink**: #E91E63 (Material Pink 500)
  - Light: #F8BBD9
  - Dark: #AD1457
  - On Primary: #FFFFFF

- **Secondary Coral**: #FF7043 (Material Deep Orange 400)  
  - Light: #FFAB91
  - Dark: #D84315
  - On Secondary: #FFFFFF

### Accent Colors
- **Success Green**: #4CAF50 (Material Green 500)
- **Warning Orange**: #FF9800 (Material Orange 500)
- **Error Red**: #F44336 (Material Red 500)
- **Info Blue**: #2196F3 (Material Blue 500)

### Neutral Colors
- **Surface**: #FFFFFF
- **Background**: #F5F5F5 (Material Grey 50)
- **On Surface**: #212121 (Material Grey 900)
- **On Background**: #424242 (Material Grey 800)
- **Outline**: #E0E0E0 (Material Grey 300)

### Dating Platform Colors
- **Tinder Red**: #FD5068
- **Bumble Yellow**: #F4C430
- **Hinge Purple**: #4B0082

## Typography

### Font Family
**Primary**: Roboto (Android native)
**Secondary**: Roboto Condensed (for headlines)

### Type Scale
- **Headline Large**: 32sp, Roboto Medium, Line Height 40sp
- **Headline Medium**: 28sp, Roboto Medium, Line Height 36sp
- **Headline Small**: 24sp, Roboto Medium, Line Height 32sp
- **Title Large**: 22sp, Roboto Medium, Line Height 28sp
- **Title Medium**: 16sp, Roboto Medium, Line Height 24sp
- **Title Small**: 14sp, Roboto Medium, Line Height 20sp
- **Body Large**: 16sp, Roboto Regular, Line Height 24sp
- **Body Medium**: 14sp, Roboto Regular, Line Height 20sp
- **Body Small**: 12sp, Roboto Regular, Line Height 16sp
- **Label Large**: 14sp, Roboto Medium, Line Height 20sp
- **Label Medium**: 12sp, Roboto Medium, Line Height 16sp
- **Label Small**: 11sp, Roboto Medium, Line Height 16sp

## Spacing System

### Grid System
- **Base Unit**: 8dp
- **Component Spacing**: 16dp, 24dp, 32dp
- **Screen Margins**: 16dp (mobile), 24dp (tablet)

### Spacing Scale
- **XS**: 4dp
- **S**: 8dp  
- **M**: 16dp
- **L**: 24dp
- **XL**: 32dp
- **XXL**: 48dp

## Iconography

### Style
- **System**: Material Design Icons 3
- **Custom**: Outlined style, 2dp stroke width
- **Sizes**: 16dp, 20dp, 24dp, 32dp, 48dp

### Key Icons
- Upload: cloud_upload
- Camera: photo_camera
- Analysis: analytics
- Bio: edit_note
- Success: check_circle
- Share: share
- Heart: favorite
- Star: star
- Settings: settings

## Elevation & Shadows

### Material Design 3 Elevation
- **Level 0**: No shadow (flush surfaces)
- **Level 1**: 1dp elevation (raised elements)
- **Level 2**: 3dp elevation (cards, buttons)
- **Level 3**: 6dp elevation (floating action buttons)
- **Level 4**: 8dp elevation (navigation drawer)
- **Level 5**: 12dp elevation (modal bottom sheets)

## Border Radius

### Radius Scale
- **Small**: 4dp (chips, tags)
- **Medium**: 8dp (cards, buttons)
- **Large**: 16dp (bottom sheets, dialogs)
- **Extra Large**: 28dp (floating action buttons)

## Animation & Motion

### Duration
- **Micro**: 100ms (hover, focus states)
- **Short**: 200ms (component transitions)
- **Medium**: 300ms (screen transitions)
- **Long**: 500ms (complex animations)

### Easing
- **Standard**: Cubic Bezier(0.2, 0.0, 0.2, 1.0)
- **Deceleration**: Cubic Bezier(0.0, 0.0, 0.2, 1.0)
- **Acceleration**: Cubic Bezier(0.4, 0.0, 1.0, 1.0)

## Component Specifications

### Buttons
- **Height**: 48dp (touch target)
- **Minimum Width**: 64dp
- **Padding**: 16dp horizontal, 12dp vertical
- **Corner Radius**: 8dp
- **Typography**: Label Large (14sp)

### Cards
- **Elevation**: Level 2 (3dp)
- **Corner Radius**: 12dp
- **Padding**: 16dp
- **Margin**: 16dp

### Text Fields
- **Height**: 56dp
- **Corner Radius**: 4dp (top corners only)
- **Padding**: 16dp horizontal, 14dp vertical
- **Typography**: Body Large (16sp)

### Bottom Navigation
- **Height**: 80dp
- **Icon Size**: 24dp
- **Typography**: Label Medium (12sp)
- **Active Color**: Primary Pink
- **Inactive Color**: On Surface (60% opacity)

## Accessibility

### Color Contrast
- **Normal Text**: 4.5:1 minimum contrast ratio
- **Large Text**: 3:1 minimum contrast ratio
- **UI Components**: 3:1 minimum contrast ratio

### Touch Targets
- **Minimum Size**: 48dp x 48dp
- **Recommended**: 56dp x 56dp for primary actions

### Focus States
- **Indicator**: 2dp outline in Primary color
- **Corner Radius**: Same as component + 2dp

## Responsive Breakpoints

### Screen Sizes
- **Small**: 360dp - 599dp (compact width)
- **Medium**: 600dp - 839dp (medium width)
- **Large**: 840dp+ (expanded width)

### Layout Guidelines
- **Small**: Single column, full-width cards
- **Medium**: Two-column grid, adaptive card widths
- **Large**: Three-column grid with side navigation

## Dating-Specific UI Patterns

### Photo Display
- **Aspect Ratio**: 4:5 (portrait, dating app standard)
- **Corner Radius**: 12dp
- **Overlay Gradient**: Black 0% to 60% opacity (bottom)

### Success Metrics
- **Color**: Success Green (#4CAF50)
- **Icon**: trending_up
- **Typography**: Title Medium with bold weight

### Improvement Tips
- **Background**: Warning Orange with 12% opacity
- **Icon**: lightbulb_outline
- **Typography**: Body Medium with medium weight

### Platform Tags
- **Tinder**: Rounded pill, Tinder Red background
- **Bumble**: Rounded pill, Bumble Yellow background  
- **Hinge**: Rounded pill, Hinge Purple background
- **Height**: 24dp
- **Typography**: Label Small

## Usage Guidelines

### Do's
- Use Material Design 3 components consistently
- Maintain 48dp minimum touch targets
- Apply elevation purposefully to show hierarchy
- Use primary colors sparingly for key actions
- Implement smooth transitions between states
- Ensure sufficient color contrast for accessibility

### Don'ts  
- Mix different design systems
- Use colors outside the defined palette
- Create touch targets smaller than 48dp
- Overuse elevation or animations
- Ignore Android platform conventions
- Compromise accessibility for aesthetics

## Implementation Notes

### React Native Paper
- Use React Native Paper components for Material Design consistency
- Customize theme colors to match brand palette
- Leverage built-in accessibility features

### Android Specific
- Support Dynamic Color (Material You) for Android 12+
- Implement proper navigation patterns (bottom tabs, navigation drawer)
- Use platform-specific icons and interactions
- Support different screen densities and orientations

### Performance
- Optimize image loading and caching
- Use efficient list components (FlatList, SectionList)
- Implement proper error boundaries
- Monitor memory usage for photo processing