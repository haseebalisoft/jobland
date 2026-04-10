import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  getConversationById,
  getConversations,
  getUnreadCount,
  patchAllConversationsRead,
  patchConversationRead,
  postConversations,
  postMessageStream,
} from '../controllers/supportChatController.js';

const router = Router();
router.use(authMiddleware);

router.post('/conversations', postConversations);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationById);
router.patch('/conversations/read-all', patchAllConversationsRead);
router.patch('/conversations/:id/read', patchConversationRead);
router.post('/message', postMessageStream);
router.get('/unread-count', getUnreadCount);

export default router;
