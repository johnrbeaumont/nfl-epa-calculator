# NFL EPA Calculator - Design System Documentation

## Overview
This document outlines the comprehensive design system implemented for the NFL EPA & Win Probability Calculator application.

## Design System Components

### 1. Design Tokens (Tailwind Config)

#### Color Palette
- **Primary (Blue)**: `nfl-primary-*` - Used for interactive elements, CTAs, and brand
- **Success (Green)**: `nfl-success-*` - Positive outcomes, successful states
- **Warning (Amber)**: `nfl-warning-*` - Caution states, important notices
- **Neutral (Gray)**: `nfl-neutral-*` - Text, backgrounds, borders

#### Typography System
- Consistent font sizes with matching line heights
- Range from `xs` (0.75rem) to `5xl` (3rem)
- Optimized for readability across all screen sizes

#### Spacing System
- 8px base unit for consistent spacing
- Predefined spacing scale from 0 to 24 (0px to 96px)
- Applied consistently across all components

#### Animations
- **fadeIn**: Smooth entrance animation for results
- **slideIn**: Lateral entrance animation for elements
- **pulse**: Subtle attention-drawing animation
- **spinner**: Loading indicator animation

### 2. Component Classes

#### Buttons
```css
.btn               /* Base button styles */
.btn-primary       /* Primary action button (blue) */
.btn-secondary     /* Secondary action button (gray) */
.btn-preset        /* Preset scenario buttons */
```

**Features:**
- Consistent padding and typography
- Smooth hover/active states
- Focus ring for accessibility
- Disabled states with visual feedback

#### Form Inputs
```css
.input             /* Base input/select styles */
.input-error       /* Error state styling */
.label             /* Form label styling */
.error-message     /* Validation error message */
```

**Features:**
- 2px focus ring in primary color
- Smooth transitions on state changes
- Red error states with icon
- Consistent sizing across all inputs

#### Cards
```css
.card              /* Base card container */
.card-hover        /* Card with hover effect */
```

**Features:**
- Rounded corners (12px)
- Shadow elevation
- Border for definition
- Hover state for interactive cards

#### Badges
```css
.badge             /* Base badge styles */
.badge-success     /* Green success badge */
.badge-warning     /* Amber warning badge */
.badge-info        /* Blue info badge */
```

#### Utilities
```css
.spinner           /* Loading spinner */
.scrollbar-thin    /* Custom thin scrollbar */
```

### 3. Accessibility Features

#### Focus Management
- Visible focus indicators on all interactive elements
- 2px outline offset for clarity
- Blue focus ring color (WCAG AA compliant)

#### Color Contrast
- All text meets WCAG AA standards for contrast
- Colorblind-friendly palette (deuteranopia/protanopia tested)
- Blue-teal-green gradient for win probability (avoids red-green)

#### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order follows logical flow
- Focus states clearly visible

### 4. Responsive Design

#### Breakpoints
- **Mobile-first**: Base styles for small screens
- **md (768px)**: Tablet and small desktop
- **lg (1024px)**: Large desktop

#### Grid Layouts
- Teams: 1 column → 2 columns (md)
- Situation: 2 columns → 3 columns (md)
- Game Clock: 2 columns → 4 columns (md)
- Results: 1 column → 2 columns (lg)

#### Mobile Optimizations
- Larger touch targets (minimum 44x44px)
- Simplified layouts on small screens
- Readable font sizes (minimum 14px body text)

### 5. Visual Hierarchy

#### Typography
- **H1**: Page title (text-4xl, 2.25rem)
- **H2**: Section headers (text-sm, semibold, uppercase)
- **H3**: Card titles (text-sm, semibold, uppercase, tracking-wide)
- **Body**: Regular content (text-sm to text-base)
- **Labels**: Form labels (text-sm, medium)

#### Spacing
- Section spacing: 8 units (2rem / 32px)
- Card padding: 6-8 units (1.5-2rem)
- Input spacing: 4 units (1rem)
- Label spacing: 1-2 units (0.25-0.5rem)

### 6. Animation Strategy

#### Performance
- CSS transforms and opacity only
- Hardware-accelerated animations
- Duration: 150ms-300ms for UI feedback
- Easing: ease-out for natural motion

#### Use Cases
- Results display: fadeIn (300ms)
- Form feedback: transitions (150ms)
- Loading states: spinner (continuous)
- Hover states: color/shadow transitions (200ms)

## Implementation Status

### ✅ Priority 1 - Critical Fixes (Completed)
1. Removed decorative emoji from header
2. Implemented colorblind-friendly colors
3. Added mobile responsive breakpoints
4. Consistent spacing system
5. Fixed accessibility violations

### ✅ Priority 2 - UX Improvements (Completed)
1. Added scenario presets (4 quick scenarios)
2. Real-time form validation with inline errors
3. Improved button states (hover, active, disabled)
4. Better loading states with spinner
5. Enhanced error messaging with icons

### ✅ Priority 3 - Visual Polish (Completed)
1. Design tokens in tailwind.config.js
2. Component class library in index.css
3. Typography system
4. Color system refinement
5. Consistent component styling

### 🔮 Priority 4 - Advanced Features (Future)
1. Dark mode support
2. Scenario comparison mode
3. Historical data visualization
4. Export/share functionality
5. Advanced animations and transitions

## Design Principles

### 1. Consistency
- Reusable component classes
- Standardized spacing and sizing
- Predictable interaction patterns

### 2. Accessibility
- WCAG AA compliance
- Keyboard navigation
- Screen reader friendly
- Colorblind safe palette

### 3. Performance
- Minimal CSS bundle size
- Optimized animations
- Fast interaction feedback
- Progressive enhancement

### 4. Maintainability
- Well-documented components
- Clear naming conventions
- Modular architecture
- Easy to extend

## Usage Examples

### Button Usage
```jsx
// Primary CTA
<button className="btn btn-primary">Calculate Predictions</button>

// Preset button
<button className="btn-preset">Goal Line Stand</button>

// Secondary action
<button className="btn btn-secondary">Reset</button>
```

### Input Usage
```jsx
// Standard input
<input className="input" type="number" />

// Input with error state
<input className={`input ${error ? 'input-error' : ''}`} />

// With label and error message
<label className="label">Distance</label>
<input className="input input-error" />
<p className="error-message">
  <svg>...</svg>
  Distance cannot exceed yards to goal
</p>
```

### Card Usage
```jsx
// Results card
<div className="card">
  <h3>Win Probability</h3>
  <p>75.5%</p>
</div>

// Interactive card
<div className="card card-hover">
  <h3>Scenario</h3>
  <p>Click to select</p>
</div>
```

## Browser Support
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile Safari: iOS 12+
- Chrome Mobile: Latest

## Testing Checklist
- [x] WCAG AA color contrast
- [x] Keyboard navigation
- [x] Screen reader compatibility
- [x] Mobile responsiveness (320px - 1920px)
- [x] Cross-browser compatibility
- [x] Touch target sizes (44x44px minimum)
- [x] Colorblind simulation (deuteranopia, protanopia)

## Future Enhancements
1. **Design Tokens Package**: Export design tokens for consistency across platforms
2. **Component Library**: Create reusable React component library
3. **Storybook Integration**: Visual component documentation
4. **Theme Variants**: Dark mode, high contrast, compact mode
5. **Advanced Animations**: Micro-interactions, transitions, loading states
