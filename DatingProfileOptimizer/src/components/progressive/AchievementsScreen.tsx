/**
 * Achievements Screen
 * Gamified progress tracking with badges and rewards
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../utils/designSystem';
import { useProgressiveDisclosure, Achievement } from '../../contexts/ProgressiveDisclosureContext';
import Card from '../shared/Card';

interface AchievementsScreenProps {
  onAchievementPress: (achievement: Achievement) => void;
}

const AchievementsScreen: React.FC<AchievementsScreenProps> = ({
  onAchievementPress,
}) => {
  const {
    getAllAchievements,
    getUnlockedAchievements,
    state,
  } = useProgressiveDisclosure();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'rarity' | 'progress'>('progress');

  const achievements = getAllAchievements();
  const unlockedAchievements = getUnlockedAchievements();

  const categories = [
    { id: 'all', name: 'All', icon: '🏆' },
    { id: 'getting-started', name: 'Getting Started', icon: '🌟' },
    { id: 'engagement', name: 'Engagement', icon: '🎯' },
    { id: 'completion', name: 'Completion', icon: '✅' },
    { id: 'consistency', name: 'Consistency', icon: '🔥' },
    { id: 'mastery', name: 'Mastery', icon: '👑' },
  ];

  const getRarityColor = (rarity: Achievement['rarity']): string => {
    switch (rarity) {
      case 'common': return COLORS.neutral[500];
      case 'uncommon': return COLORS.semantic.success;
      case 'rare': return COLORS.semantic.info;
      case 'epic': return COLORS.secondary[500];
      case 'legendary': return COLORS.primary[500];
      default: return COLORS.neutral[500];
    }
  };

  const getRarityGlow = (rarity: Achievement['rarity']): string => {
    return getRarityColor(rarity) + '30';
  };

  const getFilteredAchievements = () => {
    let filtered = achievements;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }

    // Sort achievements
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'points':
          return b.points - a.points;
        case 'rarity':
          const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
          return rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity);
        case 'progress':
          if (a.unlocked && !b.unlocked) return -1;
          if (!a.unlocked && b.unlocked) return 1;
          return (b.progress / b.maxProgress) - (a.progress / a.maxProgress);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const renderProgressBar = () => {
    const totalAchievements = achievements.length;
    const completedCount = unlockedAchievements.length;
    const completionPercentage = (completedCount / totalAchievements) * 100;

    return (
      <Card style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Overall Progress</Text>
          <Text style={styles.progressStats}>
            {completedCount} / {totalAchievements}
          </Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${completionPercentage}%` },
              ]}
            />
          </View>
          <Text style={styles.progressPercentage}>
            {Math.round(completionPercentage)}%
          </Text>
        </View>

        <View style={styles.progressFooter}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{state.totalPoints}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Level {state.userLevel}</Text>
            <Text style={styles.statLabel}>Current Level</Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderCategoryTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryTabs}
      contentContainerStyle={styles.categoryTabsContainer}
    >
      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;
        const count = category.id === 'all' 
          ? achievements.length 
          : achievements.filter(a => a.category === category.id).length;

        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryTab,
              isSelected && styles.categoryTabSelected,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text
              style={[
                styles.categoryName,
                isSelected && styles.categoryNameSelected,
              ]}
            >
              {category.name}
            </Text>
            <Text
              style={[
                styles.categoryCount,
                isSelected && styles.categoryCountSelected,
              ]}
            >
              {count}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderSortOptions = () => (
    <View style={styles.sortContainer}>
      <Text style={styles.sortLabel}>Sort by:</Text>
      <View style={styles.sortOptions}>
        {[
          { id: 'progress', name: 'Progress' },
          { id: 'points', name: 'Points' },
          { id: 'rarity', name: 'Rarity' },
          { id: 'name', name: 'Name' },
        ].map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.sortOption,
              sortBy === option.id && styles.sortOptionSelected,
            ]}
            onPress={() => setSortBy(option.id as any)}
          >
            <Text
              style={[
                styles.sortOptionText,
                sortBy === option.id && styles.sortOptionTextSelected,
              ]}
            >
              {option.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAchievement = (achievement: Achievement) => {
    const isUnlocked = achievement.unlocked;
    const progressPercentage = (achievement.progress / achievement.maxProgress) * 100;

    return (
      <TouchableOpacity
        key={achievement.id}
        onPress={() => onAchievementPress(achievement)}
        activeOpacity={0.7}
      >
        <Card
          style={[
            styles.achievementCard,
            isUnlocked && {
              backgroundColor: getRarityGlow(achievement.rarity),
              borderWidth: 1,
              borderColor: getRarityColor(achievement.rarity),
            },
          ]}
        >
          <View style={styles.achievementHeader}>
            <View
              style={[
                styles.achievementIcon,
                isUnlocked && {
                  backgroundColor: getRarityColor(achievement.rarity) + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.achievementEmoji,
                  !isUnlocked && styles.achievementEmojiLocked,
                ]}
              >
                {isUnlocked ? achievement.icon : '🔒'}
              </Text>
            </View>

            <View style={styles.achievementInfo}>
              <View style={styles.achievementTitleRow}>
                <Text
                  style={[
                    styles.achievementTitle,
                    !isUnlocked && styles.achievementTitleLocked,
                  ]}
                >
                  {achievement.title}
                </Text>
                <View style={styles.achievementMeta}>
                  <View
                    style={[
                      styles.rarityBadge,
                      { backgroundColor: getRarityColor(achievement.rarity) },
                    ]}
                  >
                    <Text style={styles.rarityText}>
                      {achievement.rarity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.pointsText}>
                    {achievement.points} pts
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.achievementDescription,
                  !isUnlocked && styles.achievementDescriptionLocked,
                ]}
              >
                {achievement.description}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          {!isUnlocked && (
            <View style={styles.achievementProgress}>
              <View style={styles.achievementProgressBar}>
                <View
                  style={[
                    styles.achievementProgressFill,
                    { width: `${progressPercentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.achievementProgressText}>
                {achievement.progress} / {achievement.maxProgress}
              </Text>
            </View>
          )}

          {/* Unlock Date */}
          {isUnlocked && achievement.unlockedAt && (
            <View style={styles.unlockInfo}>
              <Text style={styles.unlockDate}>
                🎉 Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
              </Text>
            </View>
          )}

          {/* Rewards */}
          {achievement.rewards && achievement.rewards.length > 0 && (
            <View style={styles.rewardsSection}>
              <Text style={styles.rewardsTitle}>Rewards:</Text>
              {achievement.rewards.map((reward, index) => (
                <Text key={index} style={styles.rewardText}>
                  • {reward.description}
                </Text>
              ))}
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🏆</Text>
      <Text style={styles.emptyStateTitle}>No Achievements Found</Text>
      <Text style={styles.emptyStateText}>
        Try selecting a different category or start using the app to unlock achievements!
      </Text>
    </View>
  );

  const filteredAchievements = getFilteredAchievements();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderProgressBar()}
        {renderCategoryTabs()}
        {renderSortOptions()}

        <View style={styles.achievementsList}>
          {filteredAchievements.length > 0 ? (
            filteredAchievements.map(renderAchievement)
          ) : (
            renderEmptyState()
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingBottom: SPACING.xxxl,
  },

  progressCard: {
    margin: SPACING.lg,
    padding: SPACING.lg,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  progressTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
  },

  progressStats: {
    ...TYPOGRAPHY.title.small,
    color: COLORS.primary[600],
    fontWeight: 'bold',
  },

  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },

  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.neutral[200],
    borderRadius: 4,
    marginRight: SPACING.md,
  },

  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary[500],
    borderRadius: 4,
  },

  progressPercentage: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    fontWeight: '600',
    minWidth: 35,
  },

  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.primary[600],
    fontWeight: 'bold',
  },

  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },

  categoryTabs: {
    backgroundColor: COLORS.surface.secondary,
  },

  categoryTabsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  categoryTab: {
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 80,
  },

  categoryTabSelected: {
    backgroundColor: COLORS.primary[100],
    borderColor: COLORS.primary[500],
  },

  categoryIcon: {
    fontSize: 20,
    marginBottom: SPACING.xs,
  },

  categoryName: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },

  categoryNameSelected: {
    color: COLORS.primary[700],
  },

  categoryCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontSize: 10,
  },

  categoryCountSelected: {
    color: COLORS.primary[600],
  },

  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface.secondary,
  },

  sortLabel: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    marginRight: SPACING.md,
    fontWeight: '600',
  },

  sortOptions: {
    flexDirection: 'row',
    flex: 1,
  },

  sortOption: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.xs,
  },

  sortOptionSelected: {
    backgroundColor: COLORS.primary[100],
  },

  sortOptionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  sortOptionTextSelected: {
    color: COLORS.primary[700],
  },

  achievementsList: {
    paddingHorizontal: SPACING.lg,
  },

  achievementCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },

  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },

  achievementIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },

  achievementEmoji: {
    fontSize: 28,
  },

  achievementEmojiLocked: {
    opacity: 0.5,
  },

  achievementInfo: {
    flex: 1,
  },

  achievementTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },

  achievementTitle: {
    ...TYPOGRAPHY.title.small,
    color: COLORS.text.primary,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },

  achievementTitleLocked: {
    opacity: 0.6,
  },

  achievementMeta: {
    alignItems: 'flex-end',
  },

  rarityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xs,
  },

  rarityText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.inverse,
    fontWeight: 'bold',
    fontSize: 10,
  },

  pointsText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  achievementDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },

  achievementDescriptionLocked: {
    opacity: 0.6,
  },

  achievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },

  achievementProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.neutral[200],
    borderRadius: 3,
    marginRight: SPACING.md,
  },

  achievementProgressFill: {
    height: '100%',
    backgroundColor: COLORS.semantic.success,
    borderRadius: 3,
  },

  achievementProgressText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  unlockInfo: {
    backgroundColor: COLORS.semantic.success + '10',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },

  unlockDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.semantic.success,
    fontWeight: '600',
    textAlign: 'center',
  },

  rewardsSection: {
    backgroundColor: COLORS.primary[50],
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },

  rewardsTitle: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.primary[700],
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },

  rewardText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[600],
    lineHeight: 16,
  },

  emptyState: {
    alignItems: 'center',
    padding: SPACING.xxxl,
  },

  emptyStateIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
    opacity: 0.5,
  },

  emptyStateTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },

  emptyStateText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});

export default AchievementsScreen;