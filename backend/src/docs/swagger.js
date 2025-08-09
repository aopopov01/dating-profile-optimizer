const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dating Profile Optimizer API',
      version: '1.0.0',
      description: 'AI-powered dating profile optimization API that analyzes photos and generates compelling bios',
      contact: {
        name: 'API Support',
        email: 'support@datingoptimizer.com'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3002',
        description: 'Development server'
      },
      {
        url: 'https://api.datingoptimizer.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            code: {
              type: 'string',
              example: 'ERROR_CODE'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            age: {
              type: 'integer',
              minimum: 18,
              maximum: 100
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'non-binary', 'other']
            },
            location: {
              type: 'string'
            },
            interests: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            profession: {
              type: 'string'
            },
            relationship_goals: {
              type: 'string',
              enum: ['casual', 'serious', 'friendship', 'something_casual', 'long_term']
            },
            personality_type: {
              type: 'string',
              enum: ['adventurous', 'professional', 'creative', 'humorous', 'romantic', 'intellectual']
            }
          }
        },
        PhotoAnalysis: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            user_id: {
              type: 'string',
              format: 'uuid'
            },
            photo_url: {
              type: 'string',
              format: 'url'
            },
            quality_score: {
              type: 'integer',
              minimum: 0,
              maximum: 100
            },
            attractiveness_score: {
              type: 'integer',
              minimum: 0,
              maximum: 100
            },
            background_score: {
              type: 'integer',
              minimum: 0,
              maximum: 100
            },
            outfit_score: {
              type: 'integer',
              minimum: 0,
              maximum: 100
            },
            overall_score: {
              type: 'integer',
              minimum: 0,
              maximum: 100
            },
            recommendations: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            lifestyle_signals: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            activities: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            analyzed_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        GeneratedBio: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            user_id: {
              type: 'string',
              format: 'uuid'
            },
            bio_variations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string'
                  },
                  variation: {
                    type: 'integer'
                  },
                  analysis: {
                    type: 'object',
                    properties: {
                      overall_score: {
                        type: 'number',
                        format: 'float'
                      },
                      readability_score: {
                        type: 'integer'
                      },
                      uniqueness_score: {
                        type: 'integer'
                      },
                      conversation_starter_score: {
                        type: 'integer'
                      }
                    }
                  },
                  word_count: {
                    type: 'integer'
                  },
                  character_count: {
                    type: 'integer'
                  }
                }
              }
            },
            target_platform: {
              type: 'string',
              enum: ['tinder', 'bumble', 'hinge', 'match']
            },
            personality_type: {
              type: 'string',
              enum: ['adventurous', 'professional', 'creative', 'humorous', 'romantic', 'intellectual']
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        OptimizedProfile: {
          type: 'object',
          properties: {
            photo_analysis: {
              $ref: '#/components/schemas/PhotoAnalysis'
            },
            generated_bio: {
              $ref: '#/components/schemas/GeneratedBio'
            },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['photo', 'bio', 'general']
                  },
                  priority: {
                    type: 'string',
                    enum: ['high', 'medium', 'low']
                  },
                  message: {
                    type: 'string'
                  }
                }
              }
            },
            success_prediction: {
              type: 'object',
              properties: {
                match_potential: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'very_high']
                },
                improvement_percentage: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 500
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/app.js'
  ],
};

const specs = swaggerJSDoc(options);

module.exports = {
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Dating Profile Optimizer API',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      tryItOutEnabled: true
    }
  }),
  specs
};