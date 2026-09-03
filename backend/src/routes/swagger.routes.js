import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import config from '../config/config.js';

const router = Router();

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Enterprise DDD API Documentation',
      version: '1.0.0',
      description: 'API documentation for the backend enterprise modular application',
      contact: {
        name: 'Developer Support',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'Production Relative API Path',
      },
      {
        url: `http://${config.host}:${config.port}/api`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Input your JWT token in the format: Bearer <token>',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/features/**/*.router.js', './src/features/**/*.js'], // Paths to API definitions
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Serve Swagger specification as JSON
router.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve Swagger UI
router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default router;
