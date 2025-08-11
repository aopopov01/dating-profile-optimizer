/**
 * Contextual Tooltip Component
 * Shows contextual help hints and tutorials overlays
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../utils/designSystem';
import { useHelp } from '../../contexts/HelpContext';

interface TooltipProps {
  elementId: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  priority?: 'low' | 'medium' | 'high';
  showOnce?: boolean;
  children: React.ReactNode;
  targetRef?: React.RefObject<any>;
}

interface TooltipPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ContextualTooltip: React.FC<TooltipProps> = ({
  elementId,
  title,
  content,
  position = 'top',
  priority = 'medium',
  showOnce = true,
  children,
  targetRef,
}) => {
  const { showTooltip, markTooltipShown, state } = useHelp();
  const [visible, setVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ 
    top: 0, 
    left: 0, 
    width: 0, 
    height: 0 
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  const targetElementRef = useRef<View>(null);

  // Check if tooltip should be shown
  useEffect(() => {
    if (state.isHelpMode && showTooltip(elementId)) {
      setTimeout(() => {
        measureAndShowTooltip();
      }, 500); // Small delay to ensure UI is rendered
    }
  }, [state.isHelpMode, elementId]);

  const measureAndShowTooltip = () => {
    const ref = targetRef || targetElementRef;
    
    if (ref.current) {
      ref.current.measureInWindow((x, y, width, height) => {
        setTooltipPosition({ top: y, left: x, width, height });
        setVisible(true);
        animateIn();
      });
    }
  };

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      slideAnim.setValue(10);
    });
  };

  const handleDismiss = () => {
    markTooltipShown(elementId);
    animateOut();
  };

  const getTooltipStyle = () => {
    const tooltipWidth = Math.min(screenWidth - 32, 280);
    const tooltipHeight = 120; // Estimated height
    
    let top = tooltipPosition.top;
    let left = tooltipPosition.left + (tooltipPosition.width / 2) - (tooltipWidth / 2);
    
    // Adjust based on position preference
    switch (position) {
      case 'top':
        top = tooltipPosition.top - tooltipHeight - 16;
        break;
      case 'bottom':
        top = tooltipPosition.top + tooltipPosition.height + 16;
        break;
      case 'left':
        left = tooltipPosition.left - tooltipWidth - 16;
        top = tooltipPosition.top + (tooltipPosition.height / 2) - (tooltipHeight / 2);
        break;
      case 'right':
        left = tooltipPosition.left + tooltipPosition.width + 16;
        top = tooltipPosition.top + (tooltipPosition.height / 2) - (tooltipHeight / 2);
        break;
    }
    
    // Ensure tooltip stays within screen bounds
    if (left < 16) left = 16;
    if (left + tooltipWidth > screenWidth - 16) left = screenWidth - tooltipWidth - 16;
    if (top < 100) top = tooltipPosition.top + tooltipPosition.height + 16;
    if (top + tooltipHeight > screenHeight - 100) top = tooltipPosition.top - tooltipHeight - 16;
    
    return {
      position: 'absolute' as const,
      top,
      left,
      width: tooltipWidth,
      zIndex: 9999,
    };
  };

  const getArrowStyle = () => {
    const arrowSize = 8;
    const arrowOffset = 20;
    
    let arrowStyle = {};
    
    switch (position) {
      case 'top':
        arrowStyle = {
          position: 'absolute' as const,
          bottom: -arrowSize,
          left: '50%',
          marginLeft: -arrowSize,
          width: 0,
          height: 0,
          borderLeftWidth: arrowSize,
          borderRightWidth: arrowSize,
          borderTopWidth: arrowSize,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: COLORS.neutral[800],
        };
        break;
      case 'bottom':
        arrowStyle = {
          position: 'absolute' as const,
          top: -arrowSize,
          left: '50%',
          marginLeft: -arrowSize,
          width: 0,
          height: 0,
          borderLeftWidth: arrowSize,
          borderRightWidth: arrowSize,
          borderBottomWidth: arrowSize,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: COLORS.neutral[800],
        };
        break;
      case 'left':
        arrowStyle = {
          position: 'absolute' as const,
          right: -arrowSize,
          top: '50%',
          marginTop: -arrowSize,
          width: 0,
          height: 0,
          borderTopWidth: arrowSize,
          borderBottomWidth: arrowSize,
          borderLeftWidth: arrowSize,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: COLORS.neutral[800],
        };
        break;
      case 'right':
        arrowStyle = {
          position: 'absolute' as const,
          left: -arrowSize,
          top: '50%',
          marginTop: -arrowSize,
          width: 0,
          height: 0,
          borderTopWidth: arrowSize,
          borderBottomWidth: arrowSize,
          borderRightWidth: arrowSize,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderRightColor: COLORS.neutral[800],
        };
        break;
    }
    
    return arrowStyle;
  };

  const renderHighlight = () => (
    <View
      style={[
        styles.highlight,
        {
          top: tooltipPosition.top - 4,
          left: tooltipPosition.left - 4,
          width: tooltipPosition.width + 8,
          height: tooltipPosition.height + 8,
        },
      ]}
    />
  );

  const renderTooltipContent = () => (
    <Animated.View
      style={[
        styles.tooltip,
        getTooltipStyle(),
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { 
              translateY: position === 'top' ? slideAnim : position === 'bottom' ? slideAnim.interpolate({
                inputRange: [0, 10],
                outputRange: [0, -10]
              }) : 0 
            },
          ],
        },
      ]}
    >
      <View style={getArrowStyle()} />
      
      <View style={styles.tooltipHeader}>
        <Text style={styles.tooltipTitle}>{title}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.tooltipContent}>{content}</Text>
      
      <View style={styles.tooltipFooter}>
        <TouchableOpacity style={styles.gotItButton} onPress={handleDismiss}>
          <Text style={styles.gotItButtonText}>Got it!</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <>
      <View ref={targetElementRef}>
        {children}
      </View>
      
      {visible && (
        <Modal
          transparent
          visible={visible}
          animationType="none"
          onRequestClose={handleDismiss}
        >
          <TouchableOpacity 
            style={styles.overlay}
            activeOpacity={1}
            onPress={handleDismiss}
          >
            {renderHighlight()}
            {renderTooltipContent()}
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },

  highlight: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.primary[400],
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
  },

  tooltip: {
    backgroundColor: COLORS.neutral[800],
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    minHeight: 100,
    ...SHADOWS.intense,
  },

  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },

  tooltipTitle: {
    ...TYPOGRAPHY.title.small,
    color: COLORS.text.inverse,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },

  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeButtonText: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: 'bold',
  },

  tooltipContent: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.inverse,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },

  tooltipFooter: {
    alignItems: 'flex-end',
  },

  gotItButton: {
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },

  gotItButtonText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.inverse,
    fontWeight: '600',
  },
});

export default ContextualTooltip;