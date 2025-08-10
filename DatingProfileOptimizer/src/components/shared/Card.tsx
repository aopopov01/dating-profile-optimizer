/**
 * Enhanced Card Component - Dating Profile Optimizer
 * Material Design 3 compliant with dating-specific features
 * WCAG 2.1 AA accessibility support
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
  ImageBackground,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, SIZES } from '../../utils/designSystem';

interface CardProps {
  // Content
  children: React.ReactNode;
  
  // Layout variants
  variant?: 'default' | 'elevated' | 'outlined' | 'filled' | 'photo' | 'score';
  size?: 'small' | 'medium' | 'large';
  
  // Styling
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  
  // Interactive
  onPress?: () => void;
  onLongPress?: () => void;
  pressable?: boolean;
  selected?: boolean;
  
  // Visual enhancements
  gradient?: boolean;
  backgroundImage?: string;
  overlay?: boolean;
  overlayOpacity?: number;
  
  // Layout
  fullWidth?: boolean;
  margin?: boolean;
  padding?: boolean;
  
  // Accessibility
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'none' | 'button' | 'text';
  testID?: string;
  
  // Dating-specific
  platform?: 'tinder' | 'bumble' | 'hinge';
  scoreColor?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  style,
  contentStyle,
  onPress,
  onLongPress,
  pressable = false,
  selected = false,
  gradient = false,
  backgroundImage,
  overlay = false,
  overlayOpacity = 0.6,
  fullWidth = false,
  margin = true,
  padding = true,
  accessible = true,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'none',
  testID,
  platform,
  scoreColor,
}) => {
  // Get card styles based on variant
  const getCardStyles = (): ViewStyle => {
    const baseVariants = {
      default: {
        backgroundColor: COLORS.surface.card,
        ...SHADOWS.light,
      },
      elevated: {
        backgroundColor: COLORS.surface.card,
        ...SHADOWS.medium,
      },
      outlined: {
        backgroundColor: COLORS.surface.card,
        borderWidth: 1,
        borderColor: COLORS.neutral[200],
      },
      filled: {
        backgroundColor: COLORS.surface.secondary,
      },
      photo: {
        backgroundColor: 'transparent',
        ...SHADOWS.medium,
        overflow: 'hidden' as const,
      },
      score: {
        backgroundColor: COLORS.surface.card,
        ...SHADOWS.light,
        borderLeftWidth: 4,
        borderLeftColor: scoreColor || COLORS.primary[500],
      },
    };

    const sizeStyles = {
      small: {
        minHeight: 80,
        borderRadius: RADIUS.component.card - 4,
      },
      medium: {
        minHeight: 120,
        borderRadius: RADIUS.component.card,
      },
      large: {
        minHeight: 160,
        borderRadius: RADIUS.component.card + 4,
      },
    };

    // Platform-specific styling
    const platformStyles = platform ? {
      borderTopWidth: 3,
      borderTopColor: COLORS.platform[platform],
    } : {};

    // Selected state styling
    const selectedStyles = selected ? {
      borderWidth: 2,
      borderColor: COLORS.primary[500],
      ...SHADOWS.medium,
    } : {};

    return {
      ...baseVariants[variant],
      ...sizeStyles[size],
      ...platformStyles,
      ...selectedStyles,
    };
  };

  // Get container styles
  const getContainerStyles = (): ViewStyle => {
    return {
      ...(fullWidth && { alignSelf: 'stretch' }),
      ...(margin && { 
        margin: SPACING.md,
        marginBottom: SPACING.md,
      }),
    };
  };

  // Get content styles
  const getContentStyles = (): ViewStyle => {
    return {
      ...(padding && { 
        padding: variant === 'photo' ? 0 : SPACING.component.card,
      }),
      flex: 1,
    };
  };

  // Render overlay for photo cards
  const renderOverlay = () => {
    if (!overlay || variant !== 'photo') return null;
    
    return (
      <View 
        style={[
          styles.overlay,
          { backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }
        ]}
      />
    );
  };

  // Render gradient background
  const renderGradient = () => {
    if (!gradient) return null;
    
    // This would require react-native-linear-gradient
    // For now, using a simple colored background
    return (
      <View 
        style={[
          StyleSheet.absoluteFillObject,
          { 
            backgroundColor: COLORS.primary[500],
            opacity: 0.1,
            borderRadius: RADIUS.component.card,
          }
        ]}
      />
    );
  };

  // Accessibility props
  const accessibilityProps = accessible ? {
    accessible: true,
    accessibilityRole: pressable || onPress ? 'button' : accessibilityRole,
    accessibilityLabel,
    accessibilityHint,
    accessibilityState: {
      selected,
    },
    testID,
  } : {};

  const cardStyles = getCardStyles();
  const containerStyles = getContainerStyles();
  const contentStyles = getContentStyles();

  // Determine if card should be pressable
  const isInteractive = pressable || onPress || onLongPress;

  const CardContent = () => (
    <View style={[cardStyles, style]}>
      {backgroundImage && (
        <ImageBackground 
          source={{ uri: backgroundImage }}
          style={StyleSheet.absoluteFillObject}
          imageStyle={{ 
            borderRadius: cardStyles.borderRadius as number,
            resizeMode: 'cover',
          }}
        />
      )}
      {renderGradient()}
      {renderOverlay()}
      <View style={[contentStyles, contentStyle]}>
        {children}
      </View>
    </View>
  );

  if (isInteractive) {
    return (
      <View style={containerStyles}>
        <TouchableOpacity
          onPress={onPress}
          onLongPress={onLongPress}
          activeOpacity={0.8}
          style={styles.touchable}
          {...accessibilityProps}
        >
          <CardContent />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[containerStyles, accessibilityProps]}>
      <CardContent />
    </View>
  );
};

// Preset card variants for common use cases
export const PhotoCard: React.FC<Partial<CardProps>> = (props) => (
  <Card variant="photo" overlay {...props} />
);

export const ScoreCard: React.FC<Partial<CardProps>> = (props) => (
  <Card variant="score" size="small" {...props} />
);

export const PlatformCard: React.FC<Partial<CardProps> & { platform: 'tinder' | 'bumble' | 'hinge' }> = (props) => (
  <Card variant="outlined" {...props} />
);

export const ElevatedCard: React.FC<Partial<CardProps>> = (props) => (
  <Card variant="elevated" {...props} />
);

export const OutlinedCard: React.FC<Partial<CardProps>> = (props) => (
  <Card variant="outlined" {...props} />
);

// Photo Grid Card for gallery display
interface PhotoGridCardProps extends CardProps {
  photos: string[];
  maxPhotos?: number;
  onPhotoPress?: (index: number) => void;
  aspectRatio?: number;
}

export const PhotoGridCard: React.FC<PhotoGridCardProps> = ({
  photos,
  maxPhotos = 4,
  onPhotoPress,
  aspectRatio = 4/5, // Dating app standard
  ...cardProps
}) => {
  const displayPhotos = photos.slice(0, maxPhotos);
  const remainingCount = photos.length - maxPhotos;

  return (
    <Card variant="photo" padding={false} {...cardProps}>
      <View style={styles.photoGrid}>
        {displayPhotos.map((photo, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.gridPhoto,
              { aspectRatio },
              displayPhotos.length === 1 && styles.singlePhoto,
              displayPhotos.length === 2 && styles.doublePhoto,
              displayPhotos.length >= 3 && styles.multiPhoto,
            ]}
            onPress={() => onPhotoPress?.(index)}
            activeOpacity={0.8}
          >
            <ImageBackground
              source={{ uri: photo }}
              style={styles.photoBackground}
              imageStyle={styles.photoImage}
            >
              {index === maxPhotos - 1 && remainingCount > 0 && (
                <View style={styles.photoOverlay}>
                  <View style={styles.remainingCountBadge}>
                    <Text style={styles.remainingCountText}>+{remainingCount}</Text>
                  </View>
                </View>
              )}
            </ImageBackground>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: RADIUS.component.card,
  },
  
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.component.card,
  },
  
  // Photo Grid Styles
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  
  gridPhoto: {
    overflow: 'hidden',
    borderRadius: RADIUS.sm,
  },
  
  singlePhoto: {
    width: '100%',
  },
  
  doublePhoto: {
    width: '49.5%',
  },
  
  multiPhoto: {
    width: '49.5%',
  },
  
  photoBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  
  photoImage: {
    borderRadius: RADIUS.sm,
  },
  
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  
  remainingCountBadge: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  
  remainingCountText: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Card;