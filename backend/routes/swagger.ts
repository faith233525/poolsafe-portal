import express from "express";
import swaggerUi from "swagger-ui-express";
// Install swagger-ui-express: npm install swagger-ui-express

const router = express.Router();

router.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: "/openapi/openapi.yaml",
    },
  }),
);

export default router;
