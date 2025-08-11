/**
 * Help Screen
 * Main help interface with search, categories, tutorials, and FAQ
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../utils/designSystem';
import { useHelp, HelpTopic, FAQ, Tutorial } from '../../contexts/HelpContext';
import Card from '../shared/Card';
import { SecondaryButton, TertiaryButton } from '../shared/Button';

interface HelpScreenProps {
  onNavigateToTopic: (topicId: string) => void;
  onNavigateToTutorial: (tutorialId: string) => void;
  onContactSupport: () => void;
}

const HelpScreen: React.FC<HelpScreenProps> = ({
  onNavigateToTopic,
  onNavigateToTutorial,
  onContactSupport,
}) => {
  const {
    searchHelp,
    getFAQs,
    getTutorials,
    state,
    startTutorial,
  } = useHelp();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HelpTopic[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'tutorials' | 'faq' | 'contact'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const categories = [
    { id: 'photos', title: 'Photo Analysis', icon: '📸', description: 'Learn about AI photo scoring' },
    { id: 'profile', title: 'Profile Writing', icon: '✍️', description: 'Bio and profile optimization' },
    { id: 'matching', title: 'Getting Matches', icon: '💕', description: 'Strategies for more matches' },
    { id: 'conversations', title: 'Conversations', icon: '💬', description: 'Starting and maintaining chats' },
    { id: 'account', title: 'Account & Settings', icon: '⚙️', description: 'Managing your account' },
    { id: 'technical', title: 'Technical Support', icon: '🔧', description: 'App issues and bugs' },
  ];

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchHelp(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchHelp]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reload help data
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate refresh
    setRefreshing(false);
  }, []);

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search help topics, tutorials, FAQs..."
          placeholderTextColor={COLORS.text.tertiary}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => handleSearch('')}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {isSearching && (
        <Text style={styles.searchStatus}>Searching...</Text>
      )}
      
      {searchQuery.length > 0 && !isSearching && (
        <Text style={styles.searchStatus}>
          {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
        </Text>
      )}
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {[
        { id: 'all', title: 'All', icon: '📚' },
        { id: 'tutorials', title: 'Tutorials', icon: '🎓' },
        { id: 'faq', title: 'FAQ', icon: '❓' },
        { id: 'contact', title: 'Contact', icon: '📞' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tab,
            activeTab === tab.id && styles.tabActive,
          ]}
          onPress={() => setActiveTab(tab.id as any)}
        >
          <Text style={styles.tabIcon}>{tab.icon}</Text>
          <Text
            style={[
              styles.tabText,
              activeTab === tab.id && styles.tabTextActive,
            ]}
          >
            {tab.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderQuickActions = () => (
    <Card style={styles.quickActionsCard}>
      <Text style={styles.quickActionsTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => startTutorial('first-photo-analysis')}
        >
          <Text style={styles.quickActionIcon}>📸</Text>
          <Text style={styles.quickActionText}>Photo Tutorial</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => onNavigateToTopic('bio-writing-tips')}
        >
          <Text style={styles.quickActionIcon}>✍️</Text>
          <Text style={styles.quickActionText}>Bio Guide</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickAction}
          onPress={onContactSupport}
        >
          <Text style={styles.quickActionIcon}>💬</Text>
          <Text style={styles.quickActionText}>Chat Support</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => setActiveTab('faq')}
        >
          <Text style={styles.quickActionIcon}>❓</Text>
          <Text style={styles.quickActionText}>Common FAQ</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderSearchResults = () => {
    if (searchQuery.length === 0) return null;

    return (
      <View style={styles.searchResultsContainer}>
        <Text style={styles.sectionTitle}>Search Results</Text>
        {searchResults.length === 0 ? (
          <Card style={styles.noResultsCard}>
            <Text style={styles.noResultsIcon}>🔍</Text>
            <Text style={styles.noResultsTitle}>No results found</Text>
            <Text style={styles.noResultsText}>
              Try different keywords or browse categories below
            </Text>
          </Card>
        ) : (
          searchResults.map((topic) => renderHelpTopic(topic))
        )}
      </View>
    );
  };

  const renderCategories = () => (
    <View style={styles.categoriesContainer}>
      <Text style={styles.sectionTitle}>Browse by Category</Text>
      <View style={styles.categoriesGrid}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryCard}
            onPress={() => {
              // Navigate to category
              setActiveTab('all');
              handleSearch(category.id);
            }}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <Text style={styles.categoryDescription}>{category.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTutorials = () => {
    const tutorials = getTutorials();
    
    return (
      <View style={styles.tutorialsContainer}>
        <Text style={styles.sectionTitle}>Interactive Tutorials</Text>
        {tutorials.map((tutorial) => renderTutorial(tutorial))}
      </View>
    );
  };

  const renderFAQ = () => {
    const faqs = getFAQs();
    
    return (
      <View style={styles.faqContainer}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {faqs.map((faq) => renderFAQItem(faq))}
      </View>
    );
  };

  const renderContact = () => (
    <View style={styles.contactContainer}>
      <Text style={styles.sectionTitle}>Get Support</Text>
      
      <Card style={styles.contactCard}>
        <Text style={styles.contactIcon}>💬</Text>
        <Text style={styles.contactTitle}>Chat with Support</Text>
        <Text style={styles.contactDescription}>
          Get instant help from our support team
        </Text>
        <SecondaryButton
          title="Start Chat"
          onPress={onContactSupport}
          style={styles.contactButton}
        />
      </Card>

      <Card style={styles.contactCard}>
        <Text style={styles.contactIcon}>📧</Text>
        <Text style={styles.contactTitle}>Email Support</Text>
        <Text style={styles.contactDescription}>
          Send us a detailed message and we'll get back to you
        </Text>
        <SecondaryButton
          title="Send Email"
          onPress={() => {/* Open email */}}
          style={styles.contactButton}
        />
      </Card>

      <Card style={styles.contactCard}>
        <Text style={styles.contactIcon}>🐛</Text>
        <Text style={styles.contactTitle}>Report a Bug</Text>
        <Text style={styles.contactDescription}>
          Found an issue? Help us fix it
        </Text>
        <SecondaryButton
          title="Report Bug"
          onPress={() => {/* Open bug report */}}
          style={styles.contactButton}
        />
      </Card>
    </View>
  );

  const renderHelpTopic = (topic: HelpTopic) => (
    <Card key={topic.id} style={styles.topicCard}>
      <TouchableOpacity
        onPress={() => onNavigateToTopic(topic.id)}
        style={styles.topicContent}
      >
        <View style={styles.topicHeader}>
          <Text style={styles.topicTitle}>{topic.title}</Text>
          <View style={[
            styles.difficultyBadge,
            { backgroundColor: getDifficultyColor(topic.difficulty) }
          ]}>
            <Text style={styles.difficultyText}>{topic.difficulty}</Text>
          </View>
        </View>
        
        <Text style={styles.topicDescription}>{topic.description}</Text>
        
        <View style={styles.topicFooter}>
          <Text style={styles.topicTime}>⏱️ {topic.estimatedTime}</Text>
          <Text style={styles.topicArrow}>→</Text>
        </View>
      </TouchableOpacity>
    </Card>
  );

  const renderTutorial = (tutorial: Tutorial) => (
    <Card key={tutorial.id} style={styles.tutorialCard}>
      <View style={styles.tutorialHeader}>
        <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
        {state.completedTutorials.includes(tutorial.id) && (
          <Text style={styles.completedBadge}>✓ Completed</Text>
        )}
      </View>
      
      <Text style={styles.tutorialDescription}>{tutorial.description}</Text>
      
      <View style={styles.tutorialFooter}>
        <Text style={styles.tutorialMeta}>
          ⏱️ {tutorial.estimatedTime} • {tutorial.difficulty}
        </Text>
        <TertiaryButton
          title={state.completedTutorials.includes(tutorial.id) ? "Review" : "Start"}
          onPress={() => onNavigateToTutorial(tutorial.id)}
          size="small"
        />
      </View>
    </Card>
  );

  const renderFAQItem = (faq: FAQ) => (
    <Card key={faq.id} style={styles.faqCard}>
      <Text style={styles.faqQuestion}>{faq.question}</Text>
      <Text style={styles.faqAnswer}>{faq.answer}</Text>
      <View style={styles.faqFooter}>
        <Text style={styles.faqVotes}>👍 {faq.votes} found this helpful</Text>
      </View>
    </Card>
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return COLORS.semantic.success;
      case 'intermediate': return COLORS.semantic.warning;
      case 'advanced': return COLORS.semantic.error;
      default: return COLORS.neutral[500];
    }
  };

  const renderContent = () => {
    if (searchQuery.length > 0) {
      return renderSearchResults();
    }

    switch (activeTab) {
      case 'tutorials':
        return renderTutorials();
      case 'faq':
        return renderFAQ();
      case 'contact':
        return renderContact();
      default:
        return (
          <>
            {renderQuickActions()}
            {renderCategories()}
          </>
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderSearchBar()}
      {renderTabs()}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },

  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface.primary,
    ...SHADOWS.light,
  },

  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
  },

  searchIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
    color: COLORS.text.tertiary,
  },

  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    paddingVertical: SPACING.md,
  },

  clearButton: {
    padding: SPACING.xs,
  },

  clearButtonText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.tertiary,
  },

  searchStatus: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.primary,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[200],
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  tabActive: {
    borderBottomColor: COLORS.primary[500],
  },

  tabIcon: {
    fontSize: 16,
    marginBottom: SPACING.xs,
  },

  tabText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  tabTextActive: {
    color: COLORS.primary[600],
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingBottom: SPACING.xxxl,
  },

  sectionTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },

  quickActionsCard: {
    margin: SPACING.lg,
    padding: SPACING.lg,
  },

  quickActionsTitle: {
    ...TYPOGRAPHY.title.small,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },

  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  quickAction: {
    alignItems: 'center',
    width: '22%',
    marginBottom: SPACING.sm,
  },

  quickActionIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },

  quickActionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  categoriesContainer: {
    paddingBottom: SPACING.xl,
  },

  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
  },

  categoryCard: {
    width: '48%',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    marginRight: '2%',
    ...SHADOWS.light,
  },

  categoryIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },

  categoryTitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },

  categoryDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },

  searchResultsContainer: {
    paddingBottom: SPACING.xl,
  },

  noResultsCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginHorizontal: SPACING.lg,
  },

  noResultsIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },

  noResultsTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },

  noResultsText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  topicCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },

  topicContent: {
    flex: 1,
  },

  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },

  topicTitle: {
    ...TYPOGRAPHY.title.small,
    color: COLORS.text.primary,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },

  difficultyBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },

  difficultyText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.inverse,
    fontWeight: 'bold',
  },

  topicDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },

  topicFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  topicTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },

  topicArrow: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.primary[500],
    fontWeight: 'bold',
  },

  tutorialsContainer: {
    paddingBottom: SPACING.xl,
  },

  tutorialCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },

  tutorialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },

  tutorialTitle: {
    ...TYPOGRAPHY.title.small,
    color: COLORS.text.primary,
    fontWeight: '600',
    flex: 1,
  },

  completedBadge: {
    ...TYPOGRAPHY.caption,
    color: COLORS.semantic.success,
    fontWeight: 'bold',
  },

  tutorialDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },

  tutorialFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  tutorialMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },

  faqContainer: {
    paddingBottom: SPACING.xl,
  },

  faqCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },

  faqQuestion: {
    ...TYPOGRAPHY.title.small,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },

  faqAnswer: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },

  faqFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[200],
    paddingTop: SPACING.sm,
  },

  faqVotes: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },

  contactContainer: {
    paddingBottom: SPACING.xl,
  },

  contactCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },

  contactIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },

  contactTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },

  contactDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },

  contactButton: {
    minWidth: 120,
  },
});

export default HelpScreen;