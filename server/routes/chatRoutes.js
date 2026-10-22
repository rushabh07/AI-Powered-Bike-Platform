const express = require("express");

const {
    createChat,
    listChats,
    getChat,
    sendMessage,
    editMessage,
    regenerateMessage,
    setFeedback,
    renameChat,
    deleteChat,
} = require("../controllers/chatController");

const protect = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");

const router = express.Router();

// All chat APIs require JWT — never trust a userId from the client
router.use(protect);

// AI-producing actions are additionally gated by the role permission
// "ai.advisor" (managed in the admin Routes & Permissions panel).
// Reads of one's own chats stay available; creating or generating
// answers is blocked when the role loses the permission.
router.post("/", requirePermission("ai.advisor"), createChat);
router.get("/", listChats);
router.get("/:chatId", getChat);
router.post("/:chatId/messages", requirePermission("ai.advisor"), sendMessage);
router.put("/:chatId/messages/:messageId", requirePermission("ai.advisor"), editMessage);
router.post(
    "/:chatId/messages/:messageId/regenerate",
    requirePermission("ai.advisor"),
    regenerateMessage
);
router.post(
    "/:chatId/messages/:messageId/feedback",
    setFeedback
);
router.put("/:chatId", renameChat);
router.delete("/:chatId", deleteChat);

module.exports = router;
