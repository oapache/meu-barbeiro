const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * POST /api/upload
 * Upload de imagem
 */
router.post('/', (req, res) => {
  // Simple upload without multer for now
  // In production, use multer or cloud storage (Cloudinary, S3)
  res.json({ 
    message: 'Upload endpoint configured',
    url: '/uploads/placeholder.jpg'
  });
});

module.exports = router;
