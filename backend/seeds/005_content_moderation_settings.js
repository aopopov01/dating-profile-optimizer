/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('dating_safety_tips').del();
  await knex('safety_education').del();
  await knex('content_filter_presets').del();
  await knex('ai_detection_models').del();
  await knex('content_moderation_settings').del();

  // Insert content moderation settings
  await knex('content_moderation_settings').insert([
    {
      id: 1,
      content_type: 'image',
      severity_level: 'critical',
      action_type: 'block',
      confidence_threshold: 0.95,
      detection_rules: JSON.stringify({
        nsfw_threshold: 0.9,
        violence_threshold: 0.85,
        underage_threshold: 0.8
      }),
      enabled: true
    },
    {
      id: 2,
      content_type: 'image',
      severity_level: 'high',
      action_type: 'review_required',
      confidence_threshold: 0.8,
      detection_rules: JSON.stringify({
        nsfw_threshold: 0.7,
        violence_threshold: 0.6,
        inappropriate_threshold: 0.75
      }),
      enabled: true
    },
    {
      id: 3,
      content_type: 'text',
      severity_level: 'critical',
      action_type: 'block',
      confidence_threshold: 0.9,
      detection_rules: JSON.stringify({
        toxicity_threshold: 0.85,
        threat_threshold: 0.9,
        hate_speech_threshold: 0.8
      }),
      enabled: true
    },
    {
      id: 4,
      content_type: 'text',
      severity_level: 'high',
      action_type: 'flag',
      confidence_threshold: 0.7,
      detection_rules: JSON.stringify({
        toxicity_threshold: 0.6,
        profanity_threshold: 0.75,
        spam_threshold: 0.7
      }),
      enabled: true
    },
    {
      id: 5,
      content_type: 'bio',
      severity_level: 'medium',
      action_type: 'review_required',
      confidence_threshold: 0.6,
      detection_rules: JSON.stringify({
        contact_info_threshold: 0.8,
        external_links_threshold: 0.9,
        promotional_content_threshold: 0.7
      }),
      enabled: true
    }
  ]);

  // Insert AI detection models
  await knex('ai_detection_models').insert([
    {
      id: 1,
      name: 'Google Vision SafeSearch',
      version: '2024.1',
      model_type: 'nsfw',
      description: 'Google Cloud Vision API SafeSearch detection for adult content',
      endpoint_url: 'https://vision.googleapis.com/v1/images:annotate',
      configuration: JSON.stringify({
        detection_types: ['SAFE_SEARCH_DETECTION'],
        max_results: 1
      }),
      accuracy_rate: 0.9425,
      active: true
    },
    {
      id: 2,
      name: 'AWS Rekognition Moderation',
      version: '2024.1',
      model_type: 'violence',
      description: 'AWS Rekognition content moderation for violence detection',
      endpoint_url: 'https://rekognition.us-east-1.amazonaws.com/',
      configuration: JSON.stringify({
        min_confidence: 70,
        detect_labels: ['Violence', 'Weapons', 'Drugs']
      }),
      accuracy_rate: 0.9180,
      active: true
    },
    {
      id: 3,
      name: 'Perspective API Toxicity',
      version: '2024.1',
      model_type: 'text_toxicity',
      description: 'Google Perspective API for text toxicity detection',
      endpoint_url: 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze',
      configuration: JSON.stringify({
        attributes: ['TOXICITY', 'SEVERE_TOXICITY', 'IDENTITY_ATTACK', 'INSULT', 'PROFANITY', 'THREAT'],
        languages: ['en']
      }),
      accuracy_rate: 0.8950,
      active: true
    },
    {
      id: 4,
      name: 'Face Detection Model',
      version: '2024.1',
      model_type: 'face_detection',
      description: 'Custom face detection model for profile photo validation',
      configuration: JSON.stringify({
        min_face_size: 50,
        max_faces: 1,
        face_confidence_threshold: 0.8
      }),
      accuracy_rate: 0.9650,
      active: true
    },
    {
      id: 5,
      name: 'Age Estimation Model',
      version: '2024.1',
      model_type: 'age_estimation',
      description: 'AI model for estimating age from facial features',
      configuration: JSON.stringify({
        age_range_accuracy: 3,
        confidence_threshold: 0.75
      }),
      accuracy_rate: 0.8720,
      active: true
    }
  ]);

  // Insert content filter presets
  await knex('content_filter_presets').insert([
    {
      id: 1,
      preset_name: 'Minimal Filtering',
      filter_level: 'minimal',
      description: 'Basic content filtering for mature users',
      filter_rules: JSON.stringify({
        block_explicit_content: true,
        block_hate_speech: true,
        block_harassment: true,
        allow_mild_language: true,
        allow_suggestive_content: true
      }),
      blocked_categories: JSON.stringify(['explicit_nudity', 'hate_speech', 'harassment']),
      toxicity_threshold: 0.8,
      block_contact_sharing: false,
      block_external_links: false,
      require_photo_verification: false,
      active: true
    },
    {
      id: 2,
      preset_name: 'Moderate Filtering',
      filter_level: 'moderate',
      description: 'Standard content filtering for general users',
      filter_rules: JSON.stringify({
        block_explicit_content: true,
        block_suggestive_content: true,
        block_hate_speech: true,
        block_harassment: true,
        block_spam: true,
        filter_profanity: true
      }),
      blocked_categories: JSON.stringify(['explicit_nudity', 'suggestive_content', 'hate_speech', 'harassment', 'spam', 'profanity']),
      toxicity_threshold: 0.6,
      block_contact_sharing: true,
      block_external_links: true,
      require_photo_verification: false,
      active: true
    },
    {
      id: 3,
      preset_name: 'Strict Filtering',
      filter_level: 'strict',
      description: 'Maximum content filtering for enhanced safety',
      filter_rules: JSON.stringify({
        block_explicit_content: true,
        block_suggestive_content: true,
        block_hate_speech: true,
        block_harassment: true,
        block_spam: true,
        filter_profanity: true,
        block_dating_references: true,
        require_manual_review: true
      }),
      blocked_categories: JSON.stringify(['explicit_nudity', 'suggestive_content', 'hate_speech', 'harassment', 'spam', 'profanity', 'dating_references']),
      toxicity_threshold: 0.4,
      block_contact_sharing: true,
      block_external_links: true,
      require_photo_verification: true,
      active: true
    }
  ]);

  // Insert safety education content
  await knex('safety_education').insert([
    {
      id: 1,
      title: 'First Date Safety: Essential Tips',
      content: `# First Date Safety Guidelines

## Before the Date
- Tell a trusted friend about your plans, including where you're going and who you're meeting
- Share your date's profile information with someone you trust
- Plan your own transportation - don't rely on your date for rides
- Choose a public place with plenty of people around
- Keep your phone fully charged

## During the Date
- Meet in the agreed public location - don't go to private places
- Trust your instincts - if something feels wrong, leave immediately
- Don't leave your drink unattended
- Keep your belongings with you
- Stay sober enough to make good decisions

## After the Date
- Let your trusted friend know you're safe
- Don't feel obligated to continue if you're not interested
- Report any concerning behavior to the platform

Remember: Your safety is more important than being polite.`,
      category: 'dating_safety',
      format: 'article',
      estimated_read_time: 5,
      mandatory: true,
      active: true,
      display_order: 1
    },
    {
      id: 2,
      title: 'Online Dating Red Flags',
      content: `# Recognizing Red Flags in Online Dating

## Profile Red Flags
- Photos that look too professional or model-like
- Very limited information or generic descriptions
- Inconsistencies in their story or photos
- No verification badges or social media connections

## Communication Red Flags
- Immediate requests to move off the platform
- Asking for money, gifts, or financial information
- Refusing to video chat or talk on the phone
- Getting angry when you set boundaries
- Love bombing (excessive flattery very early)

## Meeting Red Flags
- Pressuring you to meet immediately
- Suggesting private locations for first dates
- Being evasive about their identity or background
- Showing up looking significantly different from photos

## Trust Your Instincts
If something feels off, it probably is. Don't ignore your gut feelings for the sake of being polite.`,
      category: 'red_flags',
      format: 'article',
      estimated_read_time: 4,
      mandatory: false,
      active: true,
      display_order: 2
    },
    {
      id: 3,
      title: 'Digital Privacy and Security',
      content: `# Protecting Your Privacy Online

## Personal Information Protection
- Never share your full name, address, or workplace early on
- Use the app's messaging system instead of giving out your phone number
- Be cautious about sharing social media profiles
- Don't include identifying information in your photos

## Photo Safety
- Avoid photos that show your exact location
- Be mindful of reflections that might reveal information
- Consider using photos that don't appear elsewhere online
- Remove location metadata from photos

## Financial Security
- Never send money to someone you've only met online
- Be wary of investment opportunities or business proposals
- Don't share banking information or loan money
- Report financial requests immediately

## Account Security
- Use strong, unique passwords
- Enable two-factor authentication
- Regularly review your privacy settings
- Log out from shared devices`,
      category: 'online_safety',
      format: 'article',
      estimated_read_time: 6,
      mandatory: false,
      active: true,
      display_order: 3
    },
    {
      id: 4,
      title: 'Consent and Boundaries',
      content: `# Understanding Consent and Setting Boundaries

## What is Consent?
- Consent is an ongoing, enthusiastic agreement
- It can be withdrawn at any time
- It must be freely given without pressure
- Silence or lack of resistance is not consent

## Setting Boundaries
- You have the right to set limits on any interaction
- Communicate your boundaries clearly
- Don't feel obligated to explain or justify your boundaries
- A respectful person will honor your boundaries

## Digital Boundaries
- You control what photos you share and when
- You decide when to move communication off the platform
- You choose when and where to meet in person
- You can block or report anyone who makes you uncomfortable

## If Your Boundaries Are Violated
- Trust your feelings - you're not overreacting
- Document the behavior (screenshots, etc.)
- Report the user to the platform
- Consider involving law enforcement if threatened

Remember: Healthy relationships are built on mutual respect for boundaries.`,
      category: 'consent',
      format: 'article',
      estimated_read_time: 5,
      mandatory: true,
      active: true,
      display_order: 4
    },
    {
      id: 5,
      title: 'Emergency Procedures',
      content: `# Emergency Procedures and Resources

## During an Emergency
1. **Call 911 immediately** if you're in immediate danger
2. **Get to a safe location** - public place with people around
3. **Contact trusted friend or family member**
4. **Document what happened** when safe to do so

## Emergency Contacts
- **National Emergency:** 911
- **Crisis Text Line:** Text HOME to 741741
- **National Domestic Violence Hotline:** 1-800-799-7233
- **RAINN Sexual Assault Hotline:** 1-800-656-4673

## Safety Features in This App
- Emergency alert button in your profile
- Safety check-in for dates
- Quick block and report functions
- 24/7 support team for urgent issues

## Creating a Safety Plan
- Share your dating plans with trusted friends
- Set up regular check-ins
- Have a code word for emergencies
- Know your exit strategy

## After an Incident
- Prioritize your physical and emotional safety
- Consider professional support or counseling
- Report to authorities if appropriate
- Know that it's not your fault

Your safety is our top priority. Don't hesitate to use these resources.`,
      category: 'emergency_procedures',
      format: 'article',
      estimated_read_time: 7,
      mandatory: true,
      active: true,
      display_order: 5
    }
  ]);

  // Insert dating safety tips
  await knex('dating_safety_tips').insert([
    {
      id: 1,
      tip_category: 'first_meeting',
      tip_content: 'Always meet in a public place with plenty of people around for your first few dates.',
      importance_level: 'critical',
      applicable_situations: JSON.stringify(['first_date', 'early_dating']),
      show_to_new_users: true,
      active: true
    },
    {
      id: 2,
      tip_category: 'communication',
      tip_content: 'Tell a trusted friend about your date plans, including who you\'re meeting and where you\'re going.',
      importance_level: 'critical',
      applicable_situations: JSON.stringify(['first_date', 'meeting_plans']),
      show_to_new_users: true,
      active: true
    },
    {
      id: 3,
      tip_category: 'transportation',
      tip_content: 'Drive yourself or arrange your own transportation. Don\'t rely on your date for rides.',
      importance_level: 'high',
      applicable_situations: JSON.stringify(['first_date', 'meeting_plans']),
      show_to_new_users: true,
      active: true
    },
    {
      id: 4,
      tip_category: 'personal_info',
      tip_content: 'Never share personal information like your home address, workplace, or financial details early on.',
      importance_level: 'high',
      applicable_situations: JSON.stringify(['online_chatting', 'early_dating']),
      show_to_new_users: true,
      active: true
    },
    {
      id: 5,
      tip_category: 'red_flags',
      tip_content: 'Be cautious of anyone who asks for money, refuses to video chat, or pushes to meet immediately.',
      importance_level: 'critical',
      applicable_situations: JSON.stringify(['online_chatting', 'scam_prevention']),
      show_to_new_users: true,
      active: true
    },
    {
      id: 6,
      tip_category: 'alcohol_safety',
      tip_content: 'Keep your drink with you at all times and never leave it unattended.',
      importance_level: 'critical',
      applicable_situations: JSON.stringify(['date_night', 'bars_restaurants']),
      show_to_new_users: false,
      active: true
    },
    {
      id: 7,
      tip_category: 'trust_instincts',
      tip_content: 'Trust your instincts. If something feels wrong, it probably is - don\'t ignore your gut feelings.',
      importance_level: 'critical',
      applicable_situations: JSON.stringify(['all_situations']),
      show_to_new_users: true,
      active: true
    },
    {
      id: 8,
      tip_category: 'verification',
      tip_content: 'Look for verified profiles and be cautious of users without verification badges.',
      importance_level: 'medium',
      applicable_situations: JSON.stringify(['profile_browsing', 'matching']),
      show_to_new_users: true,
      active: true
    },
    {
      id: 9,
      tip_category: 'photo_sharing',
      tip_content: 'Be careful about sharing photos that reveal your location or other identifying information.',
      importance_level: 'medium',
      applicable_situations: JSON.stringify(['online_chatting', 'photo_sharing']),
      show_to_new_users: false,
      active: true
    },
    {
      id: 10,
      tip_category: 'boundaries',
      tip_content: 'It\'s okay to set boundaries and say no. A respectful person will honor your limits.',
      importance_level: 'high',
      applicable_situations: JSON.stringify(['all_situations']),
      show_to_new_users: true,
      active: true
    },
    {
      id: 11,
      tip_category: 'video_chat',
      tip_content: 'Consider video chatting before meeting in person to verify the person matches their photos.',
      importance_level: 'medium',
      applicable_situations: JSON.stringify(['before_meeting', 'verification']),
      show_to_new_users: false,
      active: true
    },
    {
      id: 12,
      tip_category: 'reporting',
      tip_content: 'Report any suspicious behavior, harassment, or safety concerns to our moderation team immediately.',
      importance_level: 'high',
      applicable_situations: JSON.stringify(['all_situations']),
      show_to_new_users: true,
      active: true
    }
  ]);
};