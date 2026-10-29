"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pullReadingState = exports.pushReadingEvents = exports.applyReadingEvents = exports.readingSyncSchema = void 0;
const zod_1 = require("zod");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const bookmark_model_1 = require("../bookmark/bookmark.model");
const highlight_model_1 = require("../highlight/highlight.model");
const lastRead_model_1 = require("../lastRead/lastRead.model");
const user_model_1 = require("./user.model");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const eventSchema = zod_1.z.object({
    id: zod_1.z.string().min(8).max(128), kind: zod_1.z.enum(['bookmark', 'highlight', 'lastRead', 'hasanat', 'settings']),
    payload: zod_1.z.object({
        surahNumber: zod_1.z.number().int().min(1).max(114).optional(),
        ayahNumber: zod_1.z.number().int().min(1).max(286).optional(),
        editionIdentifier: zod_1.z.string().max(128).optional(),
        enabled: zod_1.z.boolean().optional(), color: zod_1.z.string().max(32).nullable().optional(),
        text: zod_1.z.string().max(10000).optional(), translation: zod_1.z.string().max(20000).optional(),
        amount: zod_1.z.number().int().positive().max(10000000).optional(),
        notificationsEnabled: zod_1.z.boolean().optional(),
    }),
}).superRefine((event, ctx) => {
    if (event.kind === 'settings' ? event.payload.notificationsEnabled === undefined : event.kind === 'hasanat' ? !event.payload.amount : (!event.payload.surahNumber || !event.payload.ayahNumber))
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: 'Missing reading event fields' });
    if (event.kind === 'bookmark' && event.payload.enabled === undefined)
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: 'Bookmark state is required' });
    if (event.kind === 'highlight' && event.payload.color === undefined)
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: 'Highlight state is required' });
});
exports.readingSyncSchema = zod_1.z.object({ events: zod_1.z.array(eventSchema).max(100) });
const applyReadingEvents = async (userId, input) => {
    const { events } = exports.readingSyncSchema.parse(input);
    const accepted = [];
    for (const event of events) {
        const { surahNumber, ayahNumber, ...data } = event.payload;
        const filter = { user: userId, surahNumber, ayahNumber };
        if (event.kind === 'settings') {
            await user_model_1.User.updateOne({ _id: userId }, { $set: { 'settings.pushNotification': data.notificationsEnabled } });
        }
        else if (event.kind === 'hasanat') {
            // Deduplication and increment share a single atomic document write. A lost
            // response/retry never increments twice, including concurrent requests.
            await user_model_1.User.updateOne({ _id: userId, hasanatEventIds: { $ne: event.id } }, { $inc: { totalHasanat: data.amount }, $addToSet: { hasanatEventIds: event.id } });
        }
        else if (event.kind === 'bookmark') {
            if (data.enabled)
                await bookmark_model_1.Bookmark.findOneAndUpdate(filter, { ...filter, text: data.text, translation: data.translation, editionIdentifier: data.editionIdentifier }, { upsert: true, new: true });
            else
                await bookmark_model_1.Bookmark.deleteOne(filter);
        }
        else if (event.kind === 'highlight') {
            if (data.color)
                await highlight_model_1.Highlight.findOneAndUpdate(filter, { ...filter, color: data.color, text: data.text }, { upsert: true, new: true });
            else
                await highlight_model_1.Highlight.deleteOne(filter);
        }
        else {
            await lastRead_model_1.LastRead.findOneAndUpdate({ user: userId }, { ...filter, editionIdentifier: data.editionIdentifier }, { upsert: true, new: true });
        }
        accepted.push(event.id);
    }
    return accepted;
};
exports.applyReadingEvents = applyReadingEvents;
exports.pushReadingEvents = (0, catchAsync_1.default)(async (req, res) => {
    const accepted = await (0, exports.applyReadingEvents)(req.user.authId, req.body);
    res.json({ success: true, data: { accepted } });
});
exports.pullReadingState = (0, catchAsync_1.default)(async (req, res) => {
    const userId = req.user.authId;
    const [bookmarks, highlights, lastRead, user] = await Promise.all([
        bookmark_model_1.Bookmark.find({ user: userId }).lean(), highlight_model_1.Highlight.find({ user: userId }).lean(),
        lastRead_model_1.LastRead.findOne({ user: userId }).lean(), user_model_1.User.findById(userId).select('totalHasanat').lean(),
    ]);
    if (!user)
        throw new ApiError_1.default(404, 'User not found');
    res.json({ success: true, data: { bookmarks, highlights, lastRead, totalHasanat: user.totalHasanat } });
});
