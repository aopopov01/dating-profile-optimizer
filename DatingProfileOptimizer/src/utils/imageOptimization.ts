import { Image } from 'react-native';

export interface PhotoAnalysisResult {
  uri: string;
  qualityScore: number;
  attractivenessScore: number;
  backgroundScore: number;
  outfitScore: number;
  expressionScore: number;
  overallScore: number;
  recommendations: string[];
  strengths: string[];
  improvements: string[];
  technicalIssues: string[];
}

export interface ImageQualityMetrics {
  resolution: { width: number; height: number };
  aspectRatio: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  noise: number;
}

/**
 * Analyze image quality and composition
 */
export const analyzeImageQuality = async (imageUri: string): Promise<ImageQualityMetrics> => {
  return new Promise((resolve, reject) => {
    Image.getSize(
      imageUri,
      (width, height) => {
        // Mock analysis - in production this would use computer vision
        const mockMetrics: ImageQualityMetrics = {
          resolution: { width, height },
          aspectRatio: width / height,
          brightness: Math.random() * 50 + 50, // 50-100
          contrast: Math.random() * 40 + 60, // 60-100
          sharpness: Math.random() * 30 + 70, // 70-100
          noise: Math.random() * 20, // 0-20
        };
        resolve(mockMetrics);
      },
      (error) => {
        reject(error);
      }
    );
  });
};

/**
 * Calculate quality score based on technical metrics
 */
export const calculateQualityScore = (metrics: ImageQualityMetrics): number => {
  const { resolution, brightness, contrast, sharpness, noise } = metrics;
  
  // Resolution score (higher is better, but diminishing returns)
  const resolutionScore = Math.min(100, (resolution.width * resolution.height) / 10000);
  
  // Brightness score (ideal range 60-85)
  const brightnessScore = brightness >= 60 && brightness <= 85 ? 100 : 
    Math.max(0, 100 - Math.abs(brightness - 72.5) * 2);
  
  // Contrast score (higher is better)
  const contrastScore = Math.min(100, contrast * 1.25);
  
  // Sharpness score (higher is better)
  const sharpnessScore = Math.min(100, sharpness * 1.1);
  
  // Noise score (lower is better)
  const noiseScore = Math.max(0, 100 - noise * 5);
  
  // Weighted average
  return Math.round(
    resolutionScore * 0.2 +
    brightnessScore * 0.25 +
    contrastScore * 0.2 +
    sharpnessScore * 0.25 +
    noiseScore * 0.1
  );
};

/**
 * Optimize image for dating app usage
 */
export const optimizeImageForDating = async (imageUri: string): Promise<{
  optimizedUri: string;
  improvements: string[];
}> => {
  // Mock optimization - in production this would actually process the image
  const improvements: string[] = [];
  
  const metrics = await analyzeImageQuality(imageUri);
  
  if (metrics.brightness < 60) {
    improvements.push('Increased brightness for better visibility');
  }
  if (metrics.contrast < 70) {
    improvements.push('Enhanced contrast for more dynamic appearance');
  }
  if (metrics.sharpness < 80) {
    improvements.push('Applied sharpening filter');
  }
  
  return {
    optimizedUri: imageUri, // In production, return processed image URI
    improvements,
  };
};

/**
 * Generate technical recommendations for photo improvement
 */
export const generateTechnicalRecommendations = (metrics: ImageQualityMetrics): string[] => {
  const recommendations: string[] = [];
  
  if (metrics.resolution.width < 1080 || metrics.resolution.height < 1080) {
    recommendations.push('Use higher resolution images (at least 1080x1080)');
  }
  
  if (metrics.brightness < 50) {
    recommendations.push('Take photos in better lighting or increase brightness');
  } else if (metrics.brightness > 90) {
    recommendations.push('Avoid overexposed photos, reduce brightness');
  }
  
  if (metrics.contrast < 60) {
    recommendations.push('Increase contrast to make the photo more dynamic');
  }
  
  if (metrics.sharpness < 70) {
    recommendations.push('Ensure photos are in focus and not blurry');
  }
  
  if (metrics.noise > 15) {
    recommendations.push('Use better lighting to reduce noise/grain');
  }
  
  if (metrics.aspectRatio < 0.8 || metrics.aspectRatio > 1.25) {
    recommendations.push('Consider cropping to a more standard aspect ratio');
  }
  
  return recommendations;
};

/**
 * Batch analyze multiple photos
 */
export const batchAnalyzePhotos = async (imageUris: string[]): Promise<PhotoAnalysisResult[]> => {
  const results: PhotoAnalysisResult[] = [];
  
  for (const uri of imageUris) {
    try {
      const metrics = await analyzeImageQuality(uri);
      const qualityScore = calculateQualityScore(metrics);
      const recommendations = generateTechnicalRecommendations(metrics);
      
      // Mock additional scores - in production these would come from AI analysis
      const attractivenessScore = Math.floor(Math.random() * 30) + 70;
      const backgroundScore = Math.floor(Math.random() * 40) + 60;
      const outfitScore = Math.floor(Math.random() * 35) + 65;
      const expressionScore = Math.floor(Math.random() * 25) + 75;
      
      const overallScore = Math.round(
        qualityScore * 0.2 +
        attractivenessScore * 0.3 +
        backgroundScore * 0.2 +
        outfitScore * 0.15 +
        expressionScore * 0.15
      );
      
      results.push({
        uri,
        qualityScore,
        attractivenessScore,
        backgroundScore,
        outfitScore,
        expressionScore,
        overallScore,
        recommendations,
        strengths: generateStrengths(overallScore),
        improvements: generateImprovements(overallScore),
        technicalIssues: recommendations,
      });
    } catch (error) {
      console.error('Error analyzing photo:', uri, error);
    }
  }
  
  return results;
};

const generateStrengths = (score: number): string[] => {
  const allStrengths = [
    'Great lighting',
    'Sharp focus',
    'Good composition',
    'Natural expression',
    'Attractive background',
    'Good color balance',
    'Professional quality',
    'Engaging eye contact',
  ];
  
  const numStrengths = score >= 80 ? 3 : score >= 60 ? 2 : 1;
  return allStrengths.slice(0, numStrengths);
};

const generateImprovements = (score: number): string[] => {
  const allImprovements = [
    'Better lighting needed',
    'Improve focus/sharpness',
    'Consider background',
    'More natural expression',
    'Better composition',
    'Color correction needed',
  ];
  
  const numImprovements = score < 60 ? 3 : score < 80 ? 2 : 1;
  return allImprovements.slice(0, numImprovements);
};

/**
 * Compare two photos and determine which is better for dating
 */
export const comparePhotos = (photo1: PhotoAnalysisResult, photo2: PhotoAnalysisResult): {
  winner: PhotoAnalysisResult;
  reasons: string[];
} => {
  const reasons: string[] = [];
  
  if (photo1.overallScore > photo2.overallScore) {
    reasons.push(`Higher overall score (${photo1.overallScore} vs ${photo2.overallScore})`);
  }
  
  if (photo1.attractivenessScore > photo2.attractivenessScore + 10) {
    reasons.push('More attractive presentation');
  }
  
  if (photo1.qualityScore > photo2.qualityScore + 10) {
    reasons.push('Better technical quality');
  }
  
  const winner = photo1.overallScore >= photo2.overallScore ? photo1 : photo2;
  
  return { winner, reasons };
};