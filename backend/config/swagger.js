/**
 * Swagger Documentation Configuration
 * API documentation for the Electronics E-commerce Backend
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ElectroStore API',
      version: '1.0.0',
      description: 'Backend API for Electronics E-commerce Platform',
      contact: {
        name: 'API Support',
        email: 'support@electrostore.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
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
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['customer', 'admin'] },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zipCode: { type: 'string' },
                country: { type: 'string' }
              }
            }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            originalPrice: { type: 'number' },
            image: { type: 'string' },
            category: { type: 'string' },
            brand: { type: 'string' },
            rating: { type: 'number' },
            reviews: { type: 'number' },
            inStock: { type: 'boolean' },
            stockQuantity: { type: 'number' },
            badge: { type: 'string' },
            specs: { type: 'object' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderNumber: { type: 'string' },
            user: { type: 'string' },
            orderItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: { type: 'string' },
                  name: { type: 'string' },
                  image: { type: 'string' },
                  price: { type: 'number' },
                  quantity: { type: 'number' }
                }
              }
            },
            totalPrice: { type: 'number' },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
            },
            isPaid: { type: 'boolean' },
            isDelivered: { type: 'boolean' }
          }
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            icon: { type: 'string' }
          }
        },
        AuthLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' }
          }
        },
        AuthRegister: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            phone: { type: 'string' }
          }
        }
      }
    },
    paths: {
      '/api/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthRegister'
                }
              }
            }
          },
          responses: {
            '201': { description: 'User registered successfully' },
            '400': { description: 'Validation error or user already exists' }
          }
        }
      },
      '/api/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthLogin'
                }
              }
            }
          },
          responses: {
            '200': { description: 'Login successful' },
            '401': { description: 'Invalid credentials' }
          }
        }
      },
      '/api/products': {
        get: {
          tags: ['Products'],
          summary: 'Get all products',
          parameters: [
            {
              in: 'query',
              name: 'category',
              schema: { type: 'string' }
            },
            {
              in: 'query',
              name: 'brand',
              schema: { type: 'string' }
            },
            {
              in: 'query',
              name: 'search',
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': { description: 'Products retrieved successfully' }
          }
        }
      },
      '/api/orders': {
        get: {
          tags: ['Orders'],
          summary: 'Get user orders',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Orders retrieved successfully' }
          }
        },
        post: {
          tags: ['Orders'],
          summary: 'Create a new order',
          security: [{ bearerAuth: [] }],
          responses: {
            '201': { description: 'Order created successfully' }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
