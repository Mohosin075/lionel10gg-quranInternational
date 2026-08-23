"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const message_model_1 = require("./message.model");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
const chat_model_1 = require("../chat/chat.model");
const chat_service_1 = require("../chat/chat.service");
const emitToChat = (chatId, event, data) => {
    // @ts-expect-error global io
    const io = global.io;
    if (io) {
        io.to(`room:${chatId}`).emit(event, data);
    }
};
const emitToUser = (userId, event, data) => {
    // @ts-expect-error global io
    const io = global.io;
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};
const sendMessageToDB = async (payload) => {
    if (!payload.receiver ||
        !mongoose_1.default.Types.ObjectId.isValid(payload.receiver)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid Receiver ID');
    }
    const response = await message_model_1.Message.create(payload);
    await chat_model_1.Chat.findByIdAndUpdate(payload.chatId, {
        $set: { updatedAt: new Date() },
    });
    const chatId = String(payload.chatId);
    emitToChat(chatId, `getMessage::${chatId}`, response);
    emitToUser(String(payload.sender), `updateChatList::${payload.sender}`);
    emitToUser(String(payload.receiver), `updateChatList::${payload.receiver}`);
    return response;
};
const getMessageFromDB = async (chatId, user) => {
    await chat_service_1.ChatService.assertChatParticipant(chatId, user.authId);
    const unreadMessages = await message_model_1.Message.find({
        chatId,
        sender: { $ne: user.authId },
        seen: false,
    });
    if (unreadMessages.length > 0) {
        await message_model_1.Message.updateMany({ chatId, sender: { $ne: user.authId }, seen: false }, { $set: { seen: true } });
        const senders = [...new Set(unreadMessages.map(m => m.sender.toString()))];
        senders.forEach(senderId => {
            emitToUser(senderId, `updateChatList::${senderId}`);
        });
    }
    const messages = await message_model_1.Message.find({ chatId }).sort({ createdAt: -1 }).lean();
    return messages;
};
exports.MessageService = { sendMessageToDB, getMessageFromDB };
