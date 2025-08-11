/**
 * Accessibility Helper Functions
 * Utility functions for accessibility features
 */

import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Generate accessible label for form inputs
 */
export const generateAccessibleLabel = (
  label: string,
  value?: string,
  isRequired?: boolean,
  hasError?: boolean,
  errorMessage?: string
): string => {
  let accessibleLabel = label;
  
  if (isRequired) {
    accessibleLabel += ', required';
  }
  
  if (value) {
    accessibleLabel += `, current value: ${value}`;
  }
  
  if (hasError && errorMessage) {
    accessibleLabel += `, error: ${errorMessage}`;
  }
  
  return accessibleLabel;
};

/**
 * Generate accessible hint for interactive elements
 */
export const generateAccessibleHint = (
  action: string,
  additionalInfo?: string
): string => {
  let hint = `${action}`;
  
  if (additionalInfo) {
    hint += `. ${additionalInfo}`;
  }
  
  return hint;
};

/**
 * Check if color contrast meets WCAG guidelines
 */
export const checkColorContrast = (
  foreground: string,
  background: string,
  isLargeText: boolean = false
): { ratio: number; meetsWCAG: boolean; level: 'AA' | 'AAA' | 'fail' } => {
  // Convert hex colors to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Calculate relative luminance
  const getLuminance = (rgb: { r: number; g: number; b: number }) => {
    const rsRGB = rgb.r / 255;
    const gsRGB = rgb.g / 255;
    const bsRGB = rgb.b / 255;

    const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);

  if (!fgRgb || !bgRgb) {
    return { ratio: 0, meetsWCAG: false, level: 'fail' };
  }

  const fgLuminance = getLuminance(fgRgb);
  const bgLuminance = getLuminance(bgRgb);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  // WCAG guidelines
  const minRatioAA = isLargeText ? 3 : 4.5;
  const minRatioAAA = isLargeText ? 4.5 : 7;

  let level: 'AA' | 'AAA' | 'fail' = 'fail';
  if (ratio >= minRatioAAA) {
    level = 'AAA';
  } else if (ratio >= minRatioAA) {
    level = 'AA';
  }

  return {
    ratio: Math.round(ratio * 100) / 100,
    meetsWCAG: ratio >= minRatioAA,
    level,
  };
};

/**
 * Generate screen reader announcement for state changes
 */
export const announceStateChange = (
  newState: string,
  context?: string,
  delay: number = 500
): void => {
  setTimeout(() => {
    const announcement = context ? `${context}: ${newState}` : newState;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, delay);
};

/**
 * Create accessible role for custom components
 */
export const getAccessibleRole = (componentType: string): string => {
  const roleMap: Record<string, string> = {
    'button': 'button',
    'link': 'link',
    'input': 'text',
    'select': 'spinbutton',
    'checkbox': 'checkbox',
    'radio': 'radio',
    'switch': 'switch',
    'slider': 'adjustable',
    'tab': 'tab',
    'tabpanel': 'tabpanel',
    'modal': 'alert',
    'menu': 'menu',
    'menuitem': 'menuitem',
    'list': 'list',
    'listitem': 'listitem',
    'header': 'header',
    'heading': 'header',
    'banner': 'banner',
    'navigation': 'navigation',
    'main': 'main',
    'search': 'search',
    'form': 'form',
  };

  return roleMap[componentType.toLowerCase()] || 'none';
};

/**
 * Format text for screen readers
 */
export const formatForScreenReader = (
  text: string,
  type: 'currency' | 'percentage' | 'date' | 'number' | 'time' | 'phone' = 'number'
): string => {
  switch (type) {
    case 'currency':
      // Convert $123.45 to "123 dollars and 45 cents"
      const currency = text.replace(/[$,]/g, '');
      const [dollars, cents] = currency.split('.');
      return `${dollars} dollars${cents ? ` and ${cents} cents` : ''}`;
      
    case 'percentage':
      // Convert 85% to "85 percent"
      return text.replace('%', ' percent');
      
    case 'date':
      // Convert 12/25/2023 to "December 25th, 2023"
      const date = new Date(text);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
    case 'time':
      // Convert 14:30 to "2:30 PM"
      const [hours, minutes] = text.split(':');
      const hour12 = parseInt(hours) % 12 || 12;
      const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${ampm}`;
      
    case 'phone':
      // Convert +1234567890 to "plus 1, 2 3 4, 5 6 7, 8 9 9 0"
      return text.replace(/[\+\-\(\)]/g, '').split('').join(' ');
      
    case 'number':
      // Add commas for thousands
      return text.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      
    default:
      return text;
  }
};

/**
 * Generate accessibility traits for iOS
 */
export const getAccessibilityTraits = (
  traits: Array<'button' | 'link' | 'header' | 'search' | 'image' | 'selected' | 'plays' | 'key' | 'text' | 'summary' | 'disabled' | 'frequentUpdates' | 'startsMedia' | 'adjustable' | 'allowsDirectInteraction' | 'pageTurn'>
): string[] => {
  if (Platform.OS !== 'ios') {
    return [];
  }
  
  return traits;
};

/**
 * Validate component accessibility
 */
export interface AccessibilityValidationResult {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}

export const validateComponentAccessibility = (
  component: {
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityRole?: string;
    accessible?: boolean;
    hasInteraction?: boolean;
    hasText?: boolean;
    textColor?: string;
    backgroundColor?: string;
  }
): AccessibilityValidationResult => {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check if interactive elements have accessibility labels
  if (component.hasInteraction && !component.accessibilityLabel) {
    issues.push('Interactive element missing accessibility label');
    suggestions.push('Add accessibilityLabel to describe the element\'s purpose');
  }

  // Check if accessibility role is appropriate
  if (component.hasInteraction && !component.accessibilityRole) {
    suggestions.push('Consider adding accessibilityRole for better context');
  }

  // Check color contrast if colors are provided
  if (component.textColor && component.backgroundColor) {
    const contrast = checkColorContrast(component.textColor, component.backgroundColor);
    if (!contrast.meetsWCAG) {
      issues.push(`Color contrast ratio ${contrast.ratio} does not meet WCAG guidelines`);
      suggestions.push('Increase color contrast between text and background');
    }
  }

  // Check if hint is too long
  if (component.accessibilityHint && component.accessibilityHint.length > 100) {
    suggestions.push('Consider shortening accessibility hint for better user experience');
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
};

/**
 * Create semantic HTML-like structure for React Native
 */
export const createSemanticProps = (
  semanticType: 'header' | 'nav' | 'main' | 'section' | 'article' | 'aside' | 'footer'
) => {
  const semanticRoles: Record<string, any> = {
    header: { accessibilityRole: 'header' },
    nav: { accessibilityRole: 'navigation' },
    main: { accessibilityRole: 'main' },
    section: { accessibilityRole: 'summary' },
    article: { accessibilityRole: 'article' },
    aside: { accessibilityRole: 'complementary' },
    footer: { accessibilityRole: 'contentinfo' },
  };

  return semanticRoles[semanticType] || {};
};