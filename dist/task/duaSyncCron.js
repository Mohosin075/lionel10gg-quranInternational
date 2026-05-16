"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const dua_service_1 = require("../app/modules/dua/dua.service");
// Run every day at 3:00 AM
node_cron_1.default.schedule('0 3 * * *', async () => {
    console.log('Starting daily Dua synchronization...');
    try {
        const result = await dua_service_1.DuaService.syncEnglishDuas();
        console.log(`Dua synchronization completed. Created: ${result.createdCount}, Updated: ${result.updatedCount}`);
    }
    catch (error) {
        console.error('Error during Dua synchronization:', error);
    }
});
