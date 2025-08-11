/**
 * Bug Report Screen
 * Comprehensive bug reporting with step-by-step guidance
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../utils/designSystem';
import { PrimaryButton, SecondaryButton } from '../shared/Button';
import Card from '../shared/Card';
import { useFeedback, BugReport } from '../../contexts/FeedbackContext';

interface BugReportScreenProps {
  onSubmitted: () => void;
  onCancel: () => void;
}

const BugReportScreen: React.FC<BugReportScreenProps> = ({
  onSubmitted,
  onCancel,
}) => {
  const { submitBugReport } = useFeedback();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as BugReport['category'] | '',
    severity: '' as BugReport['severity'] | '',
    steps: [''],
    screenshots: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    'Basic Info',
    'Description',
    'Steps to Reproduce',
    'Review & Submit',
  ];

  const categories = [
    { id: 'crash', title: 'App Crash', description: 'App closes unexpectedly', icon: '💥' },
    { id: 'ui', title: 'UI/Design Issue', description: 'Visual problems or layout issues', icon: '🎨' },
    { id: 'functionality', title: 'Feature Not Working', description: 'Features behaving incorrectly', icon: '⚙️' },
    { id: 'performance', title: 'Performance Issue', description: 'Slow loading or lag', icon: '🐌' },
    { id: 'other', title: 'Other', description: 'Something else', icon: '❓' },
  ];

  const severityLevels = [
    { id: 'low', title: 'Low', description: 'Minor inconvenience', color: COLORS.semantic.success },
    { id: 'medium', title: 'Medium', description: 'Affects functionality but has workaround', color: COLORS.semantic.warning },
    { id: 'high', title: 'High', description: 'Major feature is broken', color: COLORS.semantic.error },
    { id: 'critical', title: 'Critical', description: 'App is unusable', color: COLORS.semantic.error },
  ];

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 0: // Basic Info
        if (!formData.title.trim()) {
          newErrors.title = 'Title is required';
        } else if (formData.title.trim().length < 5) {
          newErrors.title = 'Title must be at least 5 characters';
        }
        
        if (!formData.category) {
          newErrors.category = 'Please select a category';
        }
        
        if (!formData.severity) {
          newErrors.severity = 'Please select a severity level';
        }
        break;

      case 1: // Description
        if (!formData.description.trim()) {
          newErrors.description = 'Description is required';
        } else if (formData.description.trim().length < 10) {
          newErrors.description = 'Description must be at least 10 characters';
        }
        break;

      case 2: // Steps to Reproduce
        const validSteps = formData.steps.filter(step => step.trim().length > 0);
        if (validSteps.length === 0) {
          newErrors.steps = 'Please add at least one step';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onCancel();
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    
    try {
      const validSteps = formData.steps.filter(step => step.trim().length > 0);
      
      await submitBugReport({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category as BugReport['category'],
        severity: formData.severity as BugReport['severity'],
        steps: validSteps,
        screenshots: formData.screenshots,
      });

      Alert.alert(
        'Bug Report Submitted',
        'Thank you for helping us improve the app! We\'ll investigate this issue and get back to you if we need more information.',
        [{ text: 'OK', onPress: onSubmitted }]
      );
    } catch (error) {
      Alert.alert(
        'Submission Failed',
        'There was an error submitting your bug report. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, ''],
    }));
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = value;
    updateFormData('steps', newSteps);
  };

  const removeStep = (index: number) => {
    if (formData.steps.length > 1) {
      const newSteps = formData.steps.filter((_, i) => i !== index);
      updateFormData('steps', newSteps);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentStep + 1) / steps.length) * 100}%` },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
      </Text>
    </View>
  );

  const renderBasicInfoStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's the problem?</Text>
      <Text style={styles.stepDescription}>
        Help us understand the issue you're experiencing
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Title *</Text>
        <TextInput
          style={[styles.textInput, errors.title && styles.inputError]}
          placeholder="Brief description of the issue"
          value={formData.title}
          onChangeText={(value) => updateFormData('title', value)}
          maxLength={100}
        />
        {errors.title ? (
          <Text style={styles.errorText}>{errors.title}</Text>
        ) : null}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Category *</Text>
        <View style={styles.optionsGrid}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.optionCard,
                formData.category === category.id && styles.optionCardSelected,
              ]}
              onPress={() => updateFormData('category', category.id)}
            >
              <Text style={styles.optionIcon}>{category.icon}</Text>
              <Text style={styles.optionTitle}>{category.title}</Text>
              <Text style={styles.optionDescription}>{category.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.category ? (
          <Text style={styles.errorText}>{errors.category}</Text>
        ) : null}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Severity *</Text>
        <View style={styles.severityOptions}>
          {severityLevels.map((level) => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.severityOption,
                formData.severity === level.id && styles.severityOptionSelected,
                { borderColor: level.color },
              ]}
              onPress={() => updateFormData('severity', level.id)}
            >
              <View style={[styles.severityIndicator, { backgroundColor: level.color }]} />
              <View style={styles.severityContent}>
                <Text style={styles.severityTitle}>{level.title}</Text>
                <Text style={styles.severityDescription}>{level.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {errors.severity ? (
          <Text style={styles.errorText}>{errors.severity}</Text>
        ) : null}
      </View>
    </View>
  );

  const renderDescriptionStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Describe the issue</Text>
      <Text style={styles.stepDescription}>
        Provide as much detail as possible about what happened
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Detailed Description *</Text>
        <TextInput
          style={[styles.textArea, errors.description && styles.inputError]}
          placeholder="What exactly happened? What were you trying to do? What did you expect to happen vs. what actually happened?"
          value={formData.description}
          onChangeText={(value) => updateFormData('description', value)}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={styles.characterCount}>
          {formData.description.length}/1000 characters
        </Text>
        {errors.description ? (
          <Text style={styles.errorText}>{errors.description}</Text>
        ) : null}
      </View>

      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>💡 Tips for a good description:</Text>
        <Text style={styles.tipItem}>• Be specific about what you were doing</Text>
        <Text style={styles.tipItem}>• Mention any error messages you saw</Text>
        <Text style={styles.tipItem}>• Include relevant details (photo size, device orientation, etc.)</Text>
      </View>
    </View>
  );

  const renderStepsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How can we reproduce this?</Text>
      <Text style={styles.stepDescription}>
        List the steps that led to the problem so we can recreate it
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Steps to Reproduce *</Text>
        {formData.steps.map((step, index) => (
          <View key={index} style={styles.stepInputContainer}>
            <Text style={styles.stepNumber}>{index + 1}.</Text>
            <TextInput
              style={[styles.stepInput, errors.steps && styles.inputError]}
              placeholder={`Step ${index + 1}`}
              value={step}
              onChangeText={(value) => updateStep(index, value)}
              multiline
            />
            {formData.steps.length > 1 && (
              <TouchableOpacity
                style={styles.removeStepButton}
                onPress={() => removeStep(index)}
              >
                <Text style={styles.removeStepText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        
        <TouchableOpacity style={styles.addStepButton} onPress={addStep}>
          <Text style={styles.addStepText}>+ Add Step</Text>
        </TouchableOpacity>
        
        {errors.steps ? (
          <Text style={styles.errorText}>{errors.steps}</Text>
        ) : null}
      </View>

      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>📋 Example:</Text>
        <Text style={styles.tipItem}>1. Open the app</Text>
        <Text style={styles.tipItem}>2. Go to Photo Analysis</Text>
        <Text style={styles.tipItem}>3. Upload a photo</Text>
        <Text style={styles.tipItem}>4. Tap "Analyze"</Text>
        <Text style={styles.tipItem}>5. App crashes</Text>
      </View>
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Review Your Report</Text>
      <Text style={styles.stepDescription}>
        Please review your bug report before submitting
      </Text>

      <Card style={styles.reviewCard}>
        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Title:</Text>
          <Text style={styles.reviewValue}>{formData.title}</Text>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Category:</Text>
          <Text style={styles.reviewValue}>
            {categories.find(c => c.id === formData.category)?.title}
          </Text>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Severity:</Text>
          <Text style={styles.reviewValue}>
            {severityLevels.find(s => s.id === formData.severity)?.title}
          </Text>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Description:</Text>
          <Text style={styles.reviewValue}>{formData.description}</Text>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Steps:</Text>
          {formData.steps.filter(s => s.trim()).map((step, index) => (
            <Text key={index} style={styles.reviewStep}>
              {index + 1}. {step}
            </Text>
          ))}
        </View>
      </Card>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderBasicInfoStep();
      case 1:
        return renderDescriptionStep();
      case 2:
        return renderStepsStep();
      case 3:
        return renderReviewStep();
      default:
        return renderBasicInfoStep();
    }
  };

  return (
    <View style={styles.container}>
      {renderProgressBar()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentStep()}
      </ScrollView>

      <View style={styles.bottomActions}>
        <SecondaryButton
          title="Back"
          onPress={handleBack}
          size="medium"
          style={styles.backButton}
          icon={<Text style={styles.buttonIcon}>←</Text>}
          iconPosition="left"
        />

        <PrimaryButton
          title={currentStep === steps.length - 1 ? "Submit Report" : "Continue"}
          onPress={handleNext}
          loading={isSubmitting}
          size="large"
          style={styles.continueButton}
          icon={
            <Text style={styles.buttonIcon}>
              {currentStep === steps.length - 1 ? "📤" : "→"}
            </Text>
          }
          iconPosition="right"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },

  progressContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface.primary,
    ...SHADOWS.light,
  },

  progressBar: {
    height: 4,
    backgroundColor: COLORS.neutral[200],
    borderRadius: 2,
    marginBottom: SPACING.xs,
  },

  progressFill: {
    height: '100%',
    backgroundColor: COLORS.semantic.error,
    borderRadius: 2,
  },

  progressText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
    fontWeight: '600',
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingBottom: SPACING.xxxl,
  },

  stepContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },

  stepTitle: {
    ...TYPOGRAPHY.headline.small,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },

  stepDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },

  inputGroup: {
    marginBottom: SPACING.xl,
  },

  inputLabel: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },

  textInput: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.secondary,
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },

  textArea: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.secondary,
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minHeight: 120,
    textAlignVertical: 'top',
  },

  inputError: {
    borderColor: COLORS.semantic.error,
  },

  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.semantic.error,
    marginTop: SPACING.xs,
  },

  characterCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },

  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  optionCard: {
    width: '48%',
    backgroundColor: COLORS.surface.card,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
    ...SHADOWS.light,
  },

  optionCardSelected: {
    borderColor: COLORS.semantic.error,
    backgroundColor: COLORS.semantic.error + '10',
  },

  optionIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },

  optionTitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },

  optionDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  severityOptions: {
    gap: SPACING.sm,
  },

  severityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.light,
  },

  severityOptionSelected: {
    backgroundColor: COLORS.neutral[50],
  },

  severityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.md,
  },

  severityContent: {
    flex: 1,
  },

  severityTitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },

  severityDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },

  stepInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },

  stepNumber: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    fontWeight: '600',
    marginRight: SPACING.sm,
    marginTop: SPACING.md,
    minWidth: 20,
  },

  stepInput: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.secondary,
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flex: 1,
    marginRight: SPACING.sm,
  },

  removeStepButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.semantic.error + '20',
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },

  removeStepText: {
    color: COLORS.semantic.error,
    fontSize: 14,
    fontWeight: 'bold',
  },

  addStepButton: {
    backgroundColor: COLORS.neutral[100],
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },

  addStepText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  tipsContainer: {
    backgroundColor: COLORS.neutral[50],
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary[500],
  },

  tipsTitle: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },

  tipItem: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },

  reviewCard: {
    padding: SPACING.lg,
  },

  reviewSection: {
    marginBottom: SPACING.md,
  },

  reviewLabel: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },

  reviewValue: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
  },

  reviewStep: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.primary,
    marginBottom: 2,
  },

  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface.primary,
    ...SHADOWS.light,
  },

  backButton: {
    flex: 1,
    marginRight: SPACING.md,
  },

  continueButton: {
    flex: 2,
  },

  buttonIcon: {
    fontSize: 16,
  },
});

export default BugReportScreen;