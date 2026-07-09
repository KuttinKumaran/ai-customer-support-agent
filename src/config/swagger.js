const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Customer Support Agent API',
      version: '1.0.0',
      description:
        'Samsung D2C AI-powered customer support API with RAG, OMS, and Courier integration.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server',
      },
    ],
    components: {
      schemas: {
        SupportRequest: {
          type: 'object',
          required: ['customerName', 'customerMessage', 'orderId'],
          properties: {
            customerName: { type: 'string', example: 'Kumaran' },
            customerMessage: {
              type: 'string',
              example: "My Samsung TV order hasn't arrived. Please help me.",
            },
            orderId: { type: 'string', example: 'ORD1001' },
          },
        },
        SupportResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                customer: { type: 'string' },
                orderId: { type: 'string' },
                status: { type: 'string', enum: ['Delayed', 'On Track', 'Delivered'] },
                daysDelayed: { type: 'integer' },
                coupon: { type: 'integer', nullable: true },
                refund: { type: 'boolean' },
                message: { type: 'string' },
                intent: { type: 'string' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                requestId: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;
