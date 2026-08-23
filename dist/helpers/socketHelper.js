"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketHelper = void 0;
const colors_1 = __importDefault(require("colors"));
const mongoose_1 = require("mongoose");
const socketAuth_1 = require("../app/middleware/socketAuth");
const chat_model_1 = require("../app/modules/chat/chat.model");
const socket = (io) => {
    io.use(socketAuth_1.socketMiddleware.socketAuth());
    io.on('connection', (socket) => {
        var _a;
        console.log(colors_1.default.blue('A user connected'), socket.id);
        if ((_a = socket.user) === null || _a === void 0 ? void 0 : _a.authId) {
            socket.join(`user:${socket.user.authId}`);
        }
        socket.on('join-room', async (roomId) => {
            var _a;
            if (!((_a = socket.user) === null || _a === void 0 ? void 0 : _a.authId)) {
                socket.emit('socket_error', {
                    statusCode: 401,
                    error: 'Unauthorized',
                    message: 'Authentication required to join a room',
                });
                return;
            }
            if (!roomId || !mongoose_1.Types.ObjectId.isValid(roomId)) {
                socket.emit('socket_error', {
                    statusCode: 400,
                    error: 'Bad Request',
                    message: 'Invalid room id',
                });
                return;
            }
            const chat = await chat_model_1.Chat.findOne({
                _id: roomId,
                participants: socket.user.authId,
                status: true,
            }).select('_id');
            if (!chat) {
                socket.emit('socket_error', {
                    statusCode: 403,
                    error: 'Forbidden',
                    message: 'You are not a participant of this room',
                });
                return;
            }
            socket.join(`room:${roomId}`);
            console.log(colors_1.default.green(`User ${socket.id} joined room:${roomId}`));
        });
        socket.on('leave-room', (roomId) => {
            if (roomId) {
                socket.leave(`room:${roomId}`);
                console.log(colors_1.default.yellow(`User ${socket.id} left room:${roomId}`));
            }
        });
        socket.on('disconnect', () => {
            console.log(colors_1.default.red('A user disconnect'), socket.id);
        });
    });
};
exports.socketHelper = { socket };
