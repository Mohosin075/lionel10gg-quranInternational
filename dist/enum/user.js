"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterestCategory = exports.USER_STATUS = exports.USER_ROLES = void 0;
var USER_ROLES;
(function (USER_ROLES) {
    USER_ROLES["SUPER_ADMIN"] = "super_admin";
    USER_ROLES["ADMIN"] = "admin";
    USER_ROLES["USER"] = "user";
})(USER_ROLES || (exports.USER_ROLES = USER_ROLES = {}));
var USER_STATUS;
(function (USER_STATUS) {
    USER_STATUS["ACTIVE"] = "active";
    USER_STATUS["INACTIVE"] = "inactive";
    USER_STATUS["DELETED"] = "deleted";
})(USER_STATUS || (exports.USER_STATUS = USER_STATUS = {}));
var InterestCategory;
(function (InterestCategory) {
    InterestCategory["QURAN"] = "quran";
    InterestCategory["HADITH"] = "hadith";
    InterestCategory["TAFSIR"] = "tafsir";
    InterestCategory["DUA"] = "dua";
    InterestCategory["PRAYER"] = "prayer";
    InterestCategory["TAJWEED"] = "tajweed";
    InterestCategory["ISLAMIC_HISTORY"] = "islamic_history";
    InterestCategory["KIDS"] = "kids";
})(InterestCategory || (exports.InterestCategory = InterestCategory = {}));
