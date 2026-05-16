import express from 'express';
import { DuaController } from './dua.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

router.get('/version', DuaController.getVersion);
router.get('/check-sync', DuaController.checkSync);
router.get('/download-sync', DuaController.downloadSync);
router.get('/', DuaController.getAllDuas);
router.get('/:id', DuaController.getDuaById);
router.post('/sync', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), DuaController.syncDuas);
router.post('/', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), DuaController.createDua);

export const DuaRoutes = router;
