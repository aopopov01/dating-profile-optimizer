import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Switch,
  Alert,
  ActivityIndicator,
  SectionList,
  Animated,
  Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Fuse from 'fuse.js';
import { useTheme } from '../../contexts/ThemeContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useAnalytics } from '../../contexts/AnalyticsContext';
import { useLocalization } from '../../contexts/LocalizationContext';

const { width: screenWidth } = Dimensions.get('window');

// Search data interfaces
interface SearchableItem {
  id: string;
  type: 'bio' | 'photo_analysis' | 'profile' | 'recommendation' | 'success_story';
  title: string;
  content: string;
  tags: string[];
  score?: number;
  date: string;
  metadata: Record<string, any>;
}

interface SearchFilter {
  type: 'text' | 'date' | 'score' | 'tag' | 'boolean';
  key: string;
  label: string;
  description: string;
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
  defaultValue?: any;
}

interface SearchQuery {
  text: string;
  filters: Record<string, any>;
  sortBy: 'relevance' | 'date' | 'score' | 'title';
  sortOrder: 'asc' | 'desc';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  lastUsed: string;
  useCount: number;
}

interface SearchSuggestion {
  text: string;
  type: 'recent' | 'popular' | 'suggestion';
  count?: number;
}

const AdvancedSearchEngine: React.FC = () => {
  const { theme, colors } = useTheme();
  const { getAdjustedFontSize, announceForAccessibility } = useAccessibility();
  const { trackEvent } = useAnalytics();
  const { t, isRTL } = useLocalization();

  // Search state
  const [searchQuery, setSearchQuery] = useState<SearchQuery>({
    text: '',
    filters: {},
    sortBy: 'relevance',
    sortOrder: 'desc'
  });
  
  const [searchResults, setSearchResults] = useState<SearchableItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  // Animation values
  const [fadeAnimation] = useState(new Animated.Value(0));
  const [slideAnimation] = useState(new Animated.Value(300));

  // Available search filters
  const searchFilters: SearchFilter[] = [
    {
      type: 'tag',
      key: 'contentType',
      label: 'Content Type',
      description: 'Filter by type of content',
      options: [
        { value: 'bio', label: 'Generated Bios' },
        { value: 'photo_analysis', label: 'Photo Analysis' },
        { value: 'profile', label: 'Profile Data' },
        { value: 'recommendation', label: 'Recommendations' },
        { value: 'success_story', label: 'Success Stories' }
      ]
    },
    {
      type: 'score',
      key: 'scoreRange',
      label: 'Score Range',
      description: 'Filter by score (0-100)',
      min: 0,
      max: 100,
      defaultValue: [0, 100]
    },
    {
      type: 'date',
      key: 'dateRange',
      label: 'Date Range',
      description: 'Filter by creation date'
    },
    {
      type: 'tag',
      key: 'tags',
      label: 'Tags',
      description: 'Filter by content tags',
      options: [
        { value: 'dating', label: 'Dating' },
        { value: 'profile', label: 'Profile' },
        { value: 'bio', label: 'Bio' },
        { value: 'photos', label: 'Photos' },
        { value: 'tips', label: 'Tips' },
        { value: 'improvement', label: 'Improvement' },
        { value: 'success', label: 'Success' },
        { value: 'analysis', label: 'Analysis' }
      ]
    },
    {
      type: 'boolean',
      key: 'hasRecommendations',
      label: 'Has Recommendations',
      description: 'Show only items with recommendations',
      defaultValue: false
    }
  ];

  // Mock searchable data - in real app, this would come from your data store
  const searchableData: SearchableItem[] = useMemo(() => [
    // This would be populated from your actual data
    // For demo purposes, we'll use mock data
    {
      id: '1',
      type: 'bio',
      title: 'Adventurous Bio',
      content: 'Love hiking, photography, and discovering new coffee shops. Always up for an adventure!',
      tags: ['adventure', 'photography', 'coffee'],
      score: 85,
      date: '2024-01-15',
      metadata: { length: 89, style: 'casual' }
    },
    {
      id: '2',
      type: 'photo_analysis',
      title: 'Profile Photo Analysis',
      content: 'Great lighting and genuine smile. Consider adding more full-body shots.',
      tags: ['lighting', 'smile', 'improvement'],
      score: 78,
      date: '2024-01-14',
      metadata: { recommendations: 3, improvements: 2 }
    }
    // ... more mock data would go here
  ], []);

  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(() => new Fuse(searchableData, {
    keys: ['title', 'content', 'tags'],
    threshold: 0.3,
    includeScore: true,
    includeMatches: true
  }), [searchableData]);

  // Load saved searches and history
  useEffect(() => {
    loadSearchData();
  }, []);

  // Load search data from storage
  const loadSearchData = useCallback(async () => {
    try {
      const [savedSearchesData, historyData] = await Promise.all([
        AsyncStorage.getItem('@saved_searches'),
        AsyncStorage.getItem('@search_history')
      ]);

      if (savedSearchesData) {
        setSavedSearches(JSON.parse(savedSearchesData));
      }

      if (historyData) {
        setSearchHistory(JSON.parse(historyData));
      }
    } catch (error) {
      console.error('Error loading search data:', error);
    }
  }, []);

  // Generate search suggestions
  const generateSuggestions = useCallback((query: string) => {
    const suggestions: SearchSuggestion[] = [];

    // Recent searches
    const recentMatches = searchHistory
      .filter(h => h.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .map(text => ({ text, type: 'recent' as const }));

    suggestions.push(...recentMatches);

    // Popular searches (mock data)
    const popularSearches = [
      'bio improvements',
      'photo analysis tips',
      'dating profile optimization',
      'successful profiles'
    ].filter(p => p.toLowerCase().includes(query.toLowerCase()))
     .map(text => ({ text, type: 'popular' as const, count: Math.floor(Math.random() * 100) + 10 }));

    suggestions.push(...popularSearches);

    // Auto-complete suggestions based on content
    if (query.length > 2) {
      const matches = fuse.search(query, { limit: 3 });
      const contentSuggestions = matches.map(match => ({
        text: match.item.title,
        type: 'suggestion' as const
      }));
      
      suggestions.push(...contentSuggestions);
    }

    setSuggestions(suggestions.slice(0, 6));
  }, [searchHistory, fuse]);

  // Perform search
  const performSearch = useCallback(async (query: SearchQuery) => {
    if (!query.text.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      // Add to search history
      const newHistory = [query.text, ...searchHistory.filter(h => h !== query.text)].slice(0, 10);
      setSearchHistory(newHistory);
      await AsyncStorage.setItem('@search_history', JSON.stringify(newHistory));

      // Perform fuzzy search
      const fuseResults = fuse.search(query.text);
      let results = fuseResults.map(result => result.item);

      // Apply filters
      results = results.filter(item => {
        // Content type filter
        if (query.filters.contentType && query.filters.contentType.length > 0) {
          if (!query.filters.contentType.includes(item.type)) {
            return false;
          }
        }

        // Score range filter
        if (query.filters.scoreRange && item.score !== undefined) {
          const [min, max] = query.filters.scoreRange;
          if (item.score < min || item.score > max) {
            return false;
          }
        }

        // Date range filter
        if (query.filters.dateRange) {
          const itemDate = new Date(item.date);
          const { start, end } = query.filters.dateRange;
          if (itemDate < start || itemDate > end) {
            return false;
          }
        }

        // Tags filter
        if (query.filters.tags && query.filters.tags.length > 0) {
          const hasMatchingTag = query.filters.tags.some((tag: string) => 
            item.tags.includes(tag)
          );
          if (!hasMatchingTag) {
            return false;
          }
        }

        // Boolean filters
        if (query.filters.hasRecommendations && !item.metadata.recommendations) {
          return false;
        }

        return true;
      });

      // Sort results
      results.sort((a, b) => {
        let comparison = 0;
        
        switch (query.sortBy) {
          case 'date':
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
            break;
          case 'score':
            comparison = (a.score || 0) - (b.score || 0);
            break;
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'relevance':
          default:
            // Relevance is already determined by Fuse.js ordering
            return 0;
        }
        
        return query.sortOrder === 'desc' ? -comparison : comparison;
      });

      setSearchResults(results);
      setShowSuggestions(false);

      // Track search
      trackEvent('search_performed', {
        query: query.text,
        filters_count: Object.keys(query.filters).length,
        results_count: results.length,
        sort_by: query.sortBy
      });

    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'An error occurred while searching. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [fuse, searchHistory, trackEvent]);

  // Handle text input change
  const handleTextChange = useCallback((text: string) => {
    setSearchQuery(prev => ({ ...prev, text }));
    
    if (text.trim()) {
      generateSuggestions(text);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSearchResults([]);
    }
  }, [generateSuggestions]);

  // Handle search submission
  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.text.trim()) {
      performSearch(searchQuery);
      announceForAccessibility(`Searching for ${searchQuery.text}`);
    }
  }, [searchQuery, performSearch, announceForAccessibility]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    const newQuery = { ...searchQuery, text: suggestion.text };
    setSearchQuery(newQuery);
    performSearch(newQuery);
    setShowSuggestions(false);
    
    announceForAccessibility(`Selected suggestion: ${suggestion.text}`);
  }, [searchQuery, performSearch, announceForAccessibility]);

  // Save current search
  const saveCurrentSearch = useCallback(async () => {
    if (!searchQuery.text.trim()) {
      Alert.alert('Error', 'Cannot save empty search');
      return;
    }

    Alert.prompt(
      'Save Search',
      'Enter a name for this search:',
      async (name) => {
        if (name) {
          const newSavedSearch: SavedSearch = {
            id: Date.now().toString(),
            name,
            query: searchQuery,
            lastUsed: new Date().toISOString(),
            useCount: 1
          };

          const updatedSaved = [...savedSearches, newSavedSearch];
          setSavedSearches(updatedSaved);
          
          await AsyncStorage.setItem('@saved_searches', JSON.stringify(updatedSaved));
          
          Alert.alert('Success', 'Search saved successfully');
          
          trackEvent('search_saved', {
            search_name: name,
            has_filters: Object.keys(searchQuery.filters).length > 0
          });
        }
      }
    );
  }, [searchQuery, savedSearches, trackEvent]);

  // Load saved search
  const loadSavedSearch = useCallback(async (savedSearch: SavedSearch) => {
    setSearchQuery(savedSearch.query);
    await performSearch(savedSearch.query);

    // Update use count
    const updatedSaved = savedSearches.map(s => 
      s.id === savedSearch.id 
        ? { ...s, lastUsed: new Date().toISOString(), useCount: s.useCount + 1 }
        : s
    );
    setSavedSearches(updatedSaved);
    await AsyncStorage.setItem('@saved_searches', JSON.stringify(updatedSaved));

    announceForAccessibility(`Loaded saved search: ${savedSearch.name}`);
  }, [performSearch, savedSearches, announceForAccessibility]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery({
      text: '',
      filters: {},
      sortBy: 'relevance',
      sortOrder: 'desc'
    });
    setSearchResults([]);
    setShowSuggestions(false);
    
    announceForAccessibility('Search cleared');
  }, [announceForAccessibility]);

  // Toggle filters modal
  const toggleFilters = useCallback(() => {
    setShowFilters(!showFilters);
    
    if (!showFilters) {
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
    }
    
    announceForAccessibility(`Filters ${showFilters ? 'closed' : 'opened'}`);
  }, [showFilters, fadeAnimation, slideAnimation, announceForAccessibility]);

  // Render search result item
  const renderSearchResult = useCallback(({ item }: { item: SearchableItem }) => (
    <TouchableOpacity
      style={[styles.resultItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.content}. Score: ${item.score || 'N/A'}`}
    >
      <View style={styles.resultHeader}>
        <View style={styles.resultTypeIndicator}>
          <Text style={[styles.resultType, { color: colors.primary }]}>
            {item.type.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        {item.score && (
          <View style={[styles.scoreIndicator, { backgroundColor: colors.success }]}>
            <Text style={styles.scoreText}>{item.score}</Text>
          </View>
        )}
      </View>
      
      <Text style={[styles.resultTitle, { color: colors.text }]}>
        {item.title}
      </Text>
      
      <Text style={[styles.resultContent, { color: colors.textSecondary }]} numberOfLines={2}>
        {item.content}
      </Text>
      
      <View style={styles.resultFooter}>
        <View style={styles.tagContainer}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={[styles.tag, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
            </View>
          ))}
        </View>
        
        <Text style={[styles.resultDate, { color: colors.textSecondary }]}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  ), [colors]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background
    },
    searchContainer: {
      padding: 16,
      backgroundColor: colors.surface
    },
    searchInputContainer: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      marginBottom: 12
    },
    searchInput: {
      flex: 1,
      fontSize: getAdjustedFontSize(16),
      color: colors.text,
      paddingVertical: 12,
      textAlign: isRTL ? 'right' : 'left'
    },
    searchButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginLeft: isRTL ? 0 : 8,
      marginRight: isRTL ? 8 : 0
    },
    searchButtonText: {
      color: 'white',
      fontSize: getAdjustedFontSize(14),
      fontWeight: '600'
    },
    actionButtons: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between'
    },
    actionButton: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border
    },
    actionButtonText: {
      fontSize: getAdjustedFontSize(12),
      color: colors.text,
      marginLeft: isRTL ? 0 : 6,
      marginRight: isRTL ? 6 : 0
    },
    suggestionsContainer: {
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 4,
      maxHeight: 200
    },
    suggestionItem: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider
    },
    suggestionIcon: {
      fontSize: 16,
      marginRight: isRTL ? 0 : 12,
      marginLeft: isRTL ? 12 : 0
    },
    suggestionText: {
      flex: 1,
      fontSize: getAdjustedFontSize(14),
      color: colors.text
    },
    suggestionType: {
      fontSize: getAdjustedFontSize(12),
      color: colors.textSecondary,
      fontStyle: 'italic'
    },
    resultsContainer: {
      flex: 1,
      padding: 16
    },
    resultsHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
    },
    resultsCount: {
      fontSize: getAdjustedFontSize(16),
      color: colors.text,
      fontWeight: '600'
    },
    sortContainer: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center'
    },
    sortButton: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.border
    },
    sortText: {
      fontSize: getAdjustedFontSize(12),
      color: colors.text
    },
    resultItem: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12
    },
    resultHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8
    },
    resultTypeIndicator: {
      backgroundColor: colors.primary + '20',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4
    },
    resultType: {
      fontSize: getAdjustedFontSize(10),
      fontWeight: '600'
    },
    scoreIndicator: {
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4
    },
    scoreText: {
      color: 'white',
      fontSize: getAdjustedFontSize(12),
      fontWeight: 'bold'
    },
    resultTitle: {
      fontSize: getAdjustedFontSize(16),
      fontWeight: '600',
      marginBottom: 4
    },
    resultContent: {
      fontSize: getAdjustedFontSize(14),
      lineHeight: getAdjustedFontSize(20),
      marginBottom: 12
    },
    resultFooter: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    tagContainer: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      flex: 1
    },
    tag: {
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginRight: isRTL ? 0 : 8,
      marginLeft: isRTL ? 8 : 0
    },
    tagText: {
      fontSize: getAdjustedFontSize(10),
      fontWeight: '600'
    },
    resultDate: {
      fontSize: getAdjustedFontSize(12)
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 64
    },
    emptyStateText: {
      fontSize: getAdjustedFontSize(16),
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 16
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 32
    },
    loadingText: {
      marginTop: 12,
      fontSize: getAdjustedFontSize(16),
      color: colors.text
    }
  });

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('common.search')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery.text}
            onChangeText={handleTextChange}
            onSubmitEditing={handleSearchSubmit}
            accessibilityLabel="Search input"
            accessibilityHint="Type to search through your content"
          />
          
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearchSubmit}
            disabled={isSearching}
            accessibilityRole="button"
            accessibilityLabel="Perform search"
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.searchButtonText}>🔍</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={toggleFilters}
            accessibilityRole="button"
            accessibilityLabel="Open search filters"
          >
            <Text>🔧</Text>
            <Text style={styles.actionButtonText}>Filters</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={saveCurrentSearch}
            accessibilityRole="button"
            accessibilityLabel="Save current search"
          >
            <Text>💾</Text>
            <Text style={styles.actionButtonText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={clearSearch}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Text>❌</Text>
            <Text style={styles.actionButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionSelect(suggestion)}
                accessibilityRole="button"
                accessibilityLabel={`Search suggestion: ${suggestion.text}`}
              >
                <Text style={styles.suggestionIcon}>
                  {suggestion.type === 'recent' ? '🕐' : 
                   suggestion.type === 'popular' ? '🔥' : '💡'}
                </Text>
                <Text style={styles.suggestionText}>{suggestion.text}</Text>
                <Text style={styles.suggestionType}>
                  {suggestion.type === 'recent' ? 'Recent' : 
                   suggestion.type === 'popular' ? `Popular (${suggestion.count})` : 'Suggestion'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Search Results */}
      <View style={styles.resultsContainer}>
        {searchResults.length > 0 && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity style={styles.sortButton}>
              <Text style={styles.sortText}>
                Sort: {searchQuery.sortBy} ({searchQuery.sortOrder})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : searchResults.length > 0 ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            {searchResults.map((item) => renderSearchResult({ item }))}
          </ScrollView>
        ) : searchQuery.text ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>🔍</Text>
            <Text style={styles.emptyStateText}>
              No results found for "{searchQuery.text}"{'\n'}
              Try different keywords or adjust your filters
            </Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>💫</Text>
            <Text style={styles.emptyStateText}>
              Start typing to search through your{'\n'}
              bios, analyses, and recommendations
            </Text>
          </View>
        )}
      </View>

      {/* Filters Modal would go here - simplified for brevity */}
    </View>
  );
};

export default AdvancedSearchEngine;