const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Water Management System API',
      version: '1.0.0',
      description: 'API documentation for Water Management System for Gram Panchayats',
    },
    servers: [
      {
        // url: `http://localhost:${process.env.PORT || 3000}`,
        // url: `http://localhost:${process.env.PORT || 3000}`, https://jal-jeevan.onrender.com
        url: `http://jal-jeevan.onrender.com`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs;