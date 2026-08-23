"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const mongoose_1 = require("mongoose");
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_1 = require("../../../enum/user");
const user_model_1 = require("../user/user.model");
const message_model_1 = require("../message/message.model");
const chat_model_1 = require("./chat.model");
const assertChatParticipant = async (chatId, userId) => {
    if (!mongoose_1.Types.ObjectId.isValid(chatId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid chat id');
    }
    const chat = await chat_model_1.Chat.findOne({
        _id: chatId,
        participants: userId,
        status: true,
    });
    if (!chat) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not a participant of this chat');
    }
    return chat;
};
const createChatToDB = async (userId, otherUserId) => {
    if (!userId || !mongoose_1.Types.ObjectId.isValid(otherUserId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid user id');
    }
    if (String(userId) === String(otherUserId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You cannot start a chat with yourself');
    }
    const otherUser = await user_model_1.User.findOne({
        _id: otherUserId,
        status: user_1.USER_STATUS.ACTIVE,
    }).select('_id');
    if (!otherUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    }
    const participants = [userId, otherUserId];
    const isExistChat = await chat_model_1.Chat.findOne({
        participants: { $all: participants },
    });
    if (isExistChat) {
        return isExistChat;
    }
    return chat_model_1.Chat.create({ participants });
};
const getChatFromDB = async (user, search) => {
    const chats = await chat_model_1.Chat.find({ participants: { $in: [user.authId] } })
        .populate({
        path: 'participants',
        select: '_id name profile profession updatedAt',
        match: {
            _id: { $ne: user.authId },
            ...(search && { name: { $regex: search, $options: 'i' } }),
        },
    })
        .select('participants status updatedAt')
        .sort({ updatedAt: -1 }) // Sort chats by latest update
        .lean();
    // Filter out chats where no participants match
    const filteredChats = chats === null || chats === void 0 ? void 0 : chats.filter(chat => { var _a; return ((_a = chat === null || chat === void 0 ? void 0 : chat.participants) === null || _a === void 0 ? void 0 : _a.length) > 0; });
    // Get last message and unread count for each chat
    const chatsWithDetails = await Promise.all(filteredChats.map(async (chat) => {
        const lastMessage = await message_model_1.Message.findOne({ chatId: chat._id }, { text: 1, image: 1, createdAt: 1, seen: 1, sender: 1 })
            .sort({ createdAt: -1 })
            .limit(1)
            .populate('sender', 'name image') // Populate sender info if needed
            .lean();
        const unreadCount = await message_model_1.Message.countDocuments({
            chatId: chat._id,
            sender: { $ne: user.authId },
            seen: false,
        });
        return {
            ...chat,
            lastMessage: lastMessage || null,
            unreadCount,
        };
    }));
    const totalUnreadChats = chatsWithDetails.filter(chat => chat.unreadCount > 0).length;
    return {
        chats: chatsWithDetails,
        totalUnreadChats,
    };
};
exports.ChatService = {
    assertChatParticipant,
    createChatToDB,
    getChatFromDB,
};
