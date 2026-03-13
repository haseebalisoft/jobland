import { authMiddleware } from '../middlewares/authMiddleware.js';

export async function parseCv(req, res, next) {
  try {
    // For now we just accept the file and return success.
    // You can plug in real CV parsing later.
    if (!req.file && !req.files?.resume) {
      return res.status(400).json({ message: 'No resume file uploaded' });
    }

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

