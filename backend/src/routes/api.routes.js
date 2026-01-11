const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const integrationController = require('../controllers/integration.controller');
const verifyToken = require('../middlewares/auth.middleware');

router.post('/auth/login', authController.login);

router.post(
  '/integration/trigger', 
  verifyToken, 
  integrationController.triggerIntegration
);

module.exports = router;

