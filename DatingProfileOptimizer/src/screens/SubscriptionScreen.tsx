import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Surface,
  Chip,
  ActivityIndicator,
  Divider,
  RadioButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionScreenProps {
  navigation: any;
}

interface Plan {
  id: number;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  limits: {
    bio_generations_per_month: number;
    photo_analyses_per_month: number;
    support_level: string;
    trial_days?: number;
  };
  is_active: boolean;
  sort_order: number;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadPlans();
    loadCurrentSubscription();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await fetch('http://localhost:3004/api/payments/plans');
      const data = await response.json();
      
      if (response.ok && data.plans) {
        setPlans(data.plans);
        // Set free plan as default if no plan selected
        if (!selectedPlan) {
          const freePlan = data.plans.find((plan: Plan) => plan.name === 'free');
          if (freePlan) setSelectedPlan(freePlan);
        }
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const loadCurrentSubscription = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const response = await fetch('http://localhost:3004/api/user/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Find current plan
        const current = plans.find(plan => plan.name === data.stats.plan_name);
        if (current) setCurrentPlan(current);
      }
    } catch (error) {
      console.error('Error loading current subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
  };

  const getYearlySavings = (monthly: number, yearly: number) => {
    if (monthly === 0 || yearly === 0) return 0;
    const yearlyEquivalent = monthly * 12;
    return Math.round(((yearlyEquivalent - yearly) / yearlyEquivalent) * 100);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || selectedPlan.name === 'free') {
      Alert.alert('No Plan Selected', 'Please select a subscription plan to continue.');
      return;
    }

    if (currentPlan?.name === selectedPlan.name) {
      Alert.alert('Already Subscribed', 'You are already subscribed to this plan.');
      return;
    }

    setIsProcessing(true);

    try {
      const token = await AsyncStorage.getItem('@access_token');
      const response = await fetch('http://localhost:3004/api/payments/create-subscription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingPeriod,
          paymentMethod: 'mock', // Using mock payment for demo
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Subscription Successful!',
          `Welcome to ${selectedPlan.display_name}! Your subscription is now active.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setCurrentPlan(selectedPlan);
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Subscription Failed',
          data.message || 'Failed to process subscription. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert(
        'Connection Error',
        'Unable to process subscription. Please check your internet connection.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: () => {
            // Handle cancellation
            Alert.alert('Subscription Cancelled', 'Your subscription has been cancelled.');
          },
        },
      ]
    );
  };

  const renderPlanCard = (plan: Plan) => {
    const isSelected = selectedPlan?.id === plan.id;
    const isCurrent = currentPlan?.id === plan.id;
    const price = billingPeriod === 'monthly' ? plan.price_monthly : plan.price_yearly;
    const savings = getYearlySavings(plan.price_monthly, plan.price_yearly);

    return (
      <Card
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.selectedPlanCard,
          isCurrent && styles.currentPlanCard
        ]}
        onPress={() => setSelectedPlan(plan)}
      >
        <Card.Content style={styles.planContent}>
          <View style={styles.planHeader}>
            <View style={styles.planInfo}>
              <Text variant="titleLarge" style={styles.planName}>
                {plan.display_name}
              </Text>
              <Text variant="bodyMedium" style={styles.planDescription}>
                {plan.description}
              </Text>
            </View>
            
            <View style={styles.planPricing}>
              <Text variant="headlineMedium" style={styles.planPrice}>
                {formatPrice(price)}
              </Text>
              {price > 0 && (
                <Text variant="bodySmall" style={styles.planPeriod}>
                  /{billingPeriod === 'monthly' ? 'month' : 'year'}
                </Text>
              )}
              {billingPeriod === 'yearly' && savings > 0 && (
                <Chip style={styles.savingsChip} textStyle={styles.savingsText}>
                  Save {savings}%
                </Chip>
              )}
            </View>

            {isCurrent && (
              <Chip style={styles.currentChip} textStyle={styles.currentText}>
                Current Plan
              </Chip>
            )}
          </View>

          <Divider style={styles.divider} />

          <View style={styles.featuresSection}>
            <Text variant="titleSmall" style={styles.featuresTitle}>
              What's Included:
            </Text>
            {plan.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Icon name="check" size={16} color="#4caf50" />
                <Text variant="bodyMedium" style={styles.featureText}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {plan.limits.trial_days && (
            <Surface style={styles.trialBadge}>
              <Text variant="bodySmall" style={styles.trialText}>
                🎁 {plan.limits.trial_days}-day free trial included
              </Text>
            </Surface>
          )}

          <RadioButton.Item
            label=""
            value={plan.id.toString()}
            status={isSelected ? 'checked' : 'unchecked'}
            onPress={() => setSelectedPlan(plan)}
            style={styles.radioButton}
          />
        </Card.Content>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e91e63" />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading subscription plans...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Surface style={styles.header}>
          <Text variant="headlineMedium" style={styles.headerTitle}>
            Choose Your Plan
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            Unlock AI-powered profile optimization and get better matches
          </Text>
        </Surface>

        {/* Billing Period Toggle */}
        <Surface style={styles.billingToggle}>
          <Text variant="titleMedium" style={styles.billingTitle}>
            Billing Period
          </Text>
          <View style={styles.toggleContainer}>
            <Button
              mode={billingPeriod === 'monthly' ? 'contained' : 'outlined'}
              onPress={() => setBillingPeriod('monthly')}
              style={styles.toggleButton}
              compact
            >
              Monthly
            </Button>
            <Button
              mode={billingPeriod === 'yearly' ? 'contained' : 'outlined'}
              onPress={() => setBillingPeriod('yearly')}
              style={styles.toggleButton}
              compact
            >
              Yearly
            </Button>
          </View>
          {billingPeriod === 'yearly' && (
            <Text variant="bodySmall" style={styles.yearlyNote}>
              💰 Save up to 25% with yearly billing
            </Text>
          )}
        </Surface>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {plans
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(plan => renderPlanCard(plan))}
        </View>

        {/* Subscribe Button */}
        {selectedPlan && selectedPlan.name !== 'free' && currentPlan?.name !== selectedPlan.name && (
          <Surface style={styles.subscribeSection}>
            <Button
              mode="contained"
              onPress={handleSubscribe}
              disabled={isProcessing}
              loading={isProcessing}
              style={styles.subscribeButton}
              icon="credit-card"
            >
              {isProcessing ? 'Processing...' : `Subscribe to ${selectedPlan.display_name}`}
            </Button>
            <Text variant="bodySmall" style={styles.subscribeNote}>
              Cancel anytime. No hidden fees.
            </Text>
          </Surface>
        )}

        {/* Current Subscription Management */}
        {currentPlan && currentPlan.name !== 'free' && (
          <Surface style={styles.managementSection}>
            <Text variant="titleMedium" style={styles.managementTitle}>
              Manage Subscription
            </Text>
            <View style={styles.managementActions}>
              <Button
                mode="outlined"
                onPress={handleCancelSubscription}
                style={styles.cancelButton}
                textColor="#f44336"
                icon="cancel"
              >
                Cancel Subscription
              </Button>
              <Button
                mode="text"
                onPress={() => {
                  Alert.alert('Contact Support', 'Email us at support@xciterr.com for billing questions.');
                }}
                icon="help"
              >
                Billing Help
              </Button>
            </View>
          </Surface>
        )}

        {/* FAQ */}
        <Surface style={styles.faqSection}>
          <Text variant="titleMedium" style={styles.faqTitle}>
            Frequently Asked Questions
          </Text>
          <View style={styles.faqList}>
            <View style={styles.faqItem}>
              <Text variant="titleSmall" style={styles.faqQuestion}>
                Can I change or cancel my plan anytime?
              </Text>
              <Text variant="bodySmall" style={styles.faqAnswer}>
                Yes! You can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at your next billing cycle.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text variant="titleSmall" style={styles.faqQuestion}>
                What payment methods do you accept?
              </Text>
              <Text variant="bodySmall" style={styles.faqAnswer}>
                We accept all major credit cards, PayPal, and mobile payments through secure payment processors.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text variant="titleSmall" style={styles.faqQuestion}>
                Is there a free trial?
              </Text>
              <Text variant="bodySmall" style={styles.faqAnswer}>
                Yes! Premium plans include a 7-day free trial. Cancel anytime during the trial period for no charge.
              </Text>
            </View>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  header: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  billingToggle: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: 'white',
  },
  billingTitle: {
    color: '#333',
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
  },
  yearlyNote: {
    color: '#4caf50',
    textAlign: 'center',
    marginTop: 8,
  },
  plansContainer: {
    paddingHorizontal: 16,
  },
  planCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
    backgroundColor: 'white',
  },
  selectedPlanCard: {
    borderWidth: 2,
    borderColor: '#e91e63',
  },
  currentPlanCard: {
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  planContent: {
    padding: 20,
  },
  planHeader: {
    marginBottom: 16,
  },
  planInfo: {
    marginBottom: 12,
  },
  planName: {
    fontWeight: 'bold',
    color: '#333',
  },
  planDescription: {
    color: '#666',
    marginTop: 4,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  planPrice: {
    fontWeight: 'bold',
    color: '#e91e63',
  },
  planPeriod: {
    color: '#666',
  },
  savingsChip: {
    backgroundColor: '#e8f5e8',
  },
  savingsText: {
    color: '#2e7d32',
    fontSize: 12,
  },
  currentChip: {
    backgroundColor: '#e8f5e8',
    alignSelf: 'flex-start',
  },
  currentText: {
    color: '#2e7d32',
    fontSize: 12,
  },
  divider: {
    marginVertical: 16,
  },
  featuresSection: {
    marginBottom: 16,
  },
  featuresTitle: {
    color: '#333',
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  featureText: {
    color: '#555',
    flex: 1,
  },
  trialBadge: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3e5f5',
    marginBottom: 12,
  },
  trialText: {
    color: '#7b1fa2',
    textAlign: 'center',
  },
  radioButton: {
    paddingHorizontal: 0,
  },
  subscribeSection: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: 'white',
  },
  subscribeButton: {
    marginBottom: 8,
  },
  subscribeNote: {
    color: '#666',
    textAlign: 'center',
  },
  managementSection: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: 'white',
  },
  managementTitle: {
    color: '#333',
    marginBottom: 16,
  },
  managementActions: {
    gap: 12,
  },
  cancelButton: {
    borderColor: '#f44336',
  },
  faqSection: {
    margin: 16,
    marginBottom: 32,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: 'white',
  },
  faqTitle: {
    color: '#333',
    marginBottom: 16,
  },
  faqList: {
    gap: 16,
  },
  faqItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  faqQuestion: {
    color: '#333',
    marginBottom: 4,
  },
  faqAnswer: {
    color: '#666',
    lineHeight: 20,
  },
});

export default SubscriptionScreen;