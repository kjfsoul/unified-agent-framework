import { Router } from 'express';
import { brandConfig } from '../../brands';
import { AgentLogger } from '../../core/logger';
import { BrandConfigError } from '../../core/errors';
import { verifyApiKey } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();
const logger = new AgentLogger('BrandRoutes');

// Apply rate limiting
const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: Number(process.env.API_RATE_LIMIT) || 100
});

// Apply authentication if enabled
const useAuth = process.env.REQUIRE_API_KEY === 'true';
const authMiddleware = useAuth ? [verifyApiKey] : [];

/**
 * Get all brands
 * GET /brands
 */
router.get(
  '/',
  apiRateLimit,
  ...authMiddleware,
  async (req, res) => {
    try {
      logger.info('Fetching all brands');
      
      const brands = await brandConfig.getAllBrands();
      
      return res.status(200).json({
        status: 'success',
        brands: brands.map(brand => ({
          key: brand.key,
          name: brand.name,
          description: brand.description || null
        }))
      });
    } catch (error) {
      logger.error(`Error fetching brands: ${(error as Error).message}`);
      
      return res.status(500).json({
        status: 'error',
        code: 'FETCH_ERROR',
        message: (error as Error).message || 'Failed to fetch brands'
      });
    }
  }
);

/**
 * Get a brand by key
 * GET /brands/:key
 */
router.get(
  '/:key',
  apiRateLimit,
  ...authMiddleware,
  async (req, res) => {
    try {
      const { key } = req.params;
      
      logger.info(`Fetching brand: ${key}`);
      
      const brand = await brandConfig.getBrandConfig(key);
      
      return res.status(200).json({
        status: 'success',
        brand
      });
    } catch (error) {
      if (error instanceof BrandConfigError) {
        return res.status(404).json({
          status: 'error',
          code: 'BRAND_NOT_FOUND',
          message: error.message
        });
      }
      
      logger.error(`Error fetching brand: ${(error as Error).message}`);
      
      return res.status(500).json({
        status: 'error',
        code: 'FETCH_ERROR',
        message: (error as Error).message || 'Failed to fetch brand'
      });
    }
  }
);

/**
 * Update a brand
 * PUT /brands/:key
 */
router.put(
  '/:key',
  apiRateLimit,
  ...authMiddleware,
  async (req, res) => {
    try {
      const { key } = req.params;
      const config = req.body;
      
      logger.info(`Updating brand: ${key}`);
      
      // Ensure key in params matches key in body
      if (config.key && config.key !== key) {
        return res.status(400).json({
          status: 'error',
          code: 'KEY_MISMATCH',
          message: 'Brand key in URL must match key in request body'
        });
      }
      
      // Update config
      await brandConfig.updateBrandConfig(key, config);
      
      return res.status(200).json({
        status: 'success',
        message: `Brand ${key} updated successfully`
      });
    } catch (error) {
      if (error instanceof BrandConfigError) {
        return res.status(400).json({
          status: 'error',
          code: 'BRAND_UPDATE_ERROR',
          message: error.message
        });
      }
      
      logger.error(`Error updating brand: ${(error as Error).message}`);
      
      return res.status(500).json({
        status: 'error',
        code: 'UPDATE_ERROR',
        message: (error as Error).message || 'Failed to update brand'
      });
    }
  }
);

/**
 * Create a new brand
 * POST /brands
 */
router.post(
  '/',
  apiRateLimit,
  ...authMiddleware,
  async (req, res) => {
    try {
      const config = req.body;
      
      logger.info(`Creating new brand: ${config.key}`);
      
      // Create new brand
      await brandConfig.createBrandConfig(config);
      
      return res.status(201).json({
        status: 'success',
        message: `Brand ${config.key} created successfully`
      });
    } catch (error) {
      if (error instanceof BrandConfigError) {
        return res.status(400).json({
          status: 'error',
          code: 'BRAND_CREATE_ERROR',
          message: error.message
        });
      }
      
      logger.error(`Error creating brand: ${(error as Error).message}`);
      
      return res.status(500).json({
        status: 'error',
        code: 'CREATE_ERROR',
        message: (error as Error).message || 'Failed to create brand'
      });
    }
  }
);

export default router;