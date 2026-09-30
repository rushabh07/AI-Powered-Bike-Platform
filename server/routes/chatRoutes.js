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

const router = express.Router();

// All chat APIs require JWT — never trust a userId from the client
router.use(protect);

router.post("/", createChat);
router.get("/", listChats);
router.get("/:chatId", getChat);
router.post("/:chatId/messages", sendMessage);
router.put("/:chatId/messages/:messageId", editMessage);
router.post(
    "/:chatId/messages/:messageId/regenerate",
    regenerateMessage
);
router.post(
    "/:chatId/messages/:messageId/feedback",
    setFeedback
);
router.put("/:chatId", renameChat);
router.delete("/:chatId", deleteChat);

module.exports = router;
