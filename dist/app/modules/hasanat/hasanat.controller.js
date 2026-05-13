"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HasanatController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const hasanat_service_1 = require("./hasanat.service");
const collectHasanat = (0, catchAsync_1.default)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const { amount } = req.body;
    const result = await hasanat_service_1.HasanatService.collectHasanat(userId, amount);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Hasanat collected successfully',
        data: {
            totalHasanat: result.totalHasanat,
        },
    });
});
exports.HasanatController = {
    collectHasanat,
};
