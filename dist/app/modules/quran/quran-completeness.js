"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCompleteSurah = void 0;
const isCompleteSurah = (rows, expected, requireTranslation = true) => rows.length === expected &&
    new Set(rows.map(row => row.ayah)).size === expected &&
    rows.every(row => {
        var _a;
        return row.ayah >= 1 &&
            row.ayah <= expected &&
            /[\u0600-\u06ff]/.test(row.arabicText || '') &&
            (!requireTranslation || !!((_a = row.text) === null || _a === void 0 ? void 0 : _a.trim()));
    });
exports.isCompleteSurah = isCompleteSurah;
