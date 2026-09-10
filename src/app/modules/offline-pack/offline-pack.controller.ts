import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { OfflinePackService, SupportedModule } from './offline-pack.service';

const VALID_MODULES: SupportedModule[] = [
  'hadith',
  'dua',
  'knowledge',
  'quran',
  'tafsir',
  'book',
  'fatwa',
];

const validateModule = (mod: string): SupportedModule => {
  if (!VALID_MODULES.includes(mod as SupportedModule)) {
    throw new Error(`Invalid module "${mod}". Supported: ${VALID_MODULES.join(', ')}`);
  }
  return mod as SupportedModule;
};

// GET /offline-pack/check-sync?module=hadith&lang=de&version=1
const checkSync = catchAsync(async (req: Request, res: Response) => {
  const module = validateModule((req.query.module as string) || 'hadith');
  const lang = (req.query.lang as string) || 'en';
  const clientVersion = Number(req.query.version) || 0;

  const result = await OfflinePackService.checkSync(module, lang, clientVersion);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Pack sync status checked successfully',
    data: result,
  });
});

// GET /offline-pack/download/:module?lang=de
// Streams the gzip pack directly from S3 with correct headers for mobile clients
const downloadPack = catchAsync(async (req: Request, res: Response) => {
  const module = validateModule(req.params.module);
  const lang = (req.query.lang as string) || 'en';

  const { stream, sha256, packSizeMb, version } = await OfflinePackService.getPackStream(module, lang);

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Encoding', 'gzip');
  res.setHeader('X-Pack-Sha256', sha256);
  res.setHeader('X-Pack-Version', String(version));
  res.setHeader('X-Pack-Size-Mb', String(packSizeMb));
  res.setHeader('Content-Disposition', `attachment; filename="${module}_${lang}_v${version}.json.gz"`);

  (stream as NodeJS.ReadableStream).pipe(res);
});

// POST /offline-pack/generate  (Admin only)
// Body: { module: "hadith", lang: "de" }
const generatePack = catchAsync(async (req: Request, res: Response) => {
  const module = validateModule(req.body.module || 'hadith');
  const lang = (req.body.lang as string) || 'en';

  const result = await OfflinePackService.generateAndUploadPack(module, lang);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Pack generated and uploaded to S3 successfully`,
    data: result,
  });
});

// GET /offline-pack/list  (Admin: see all generated packs)
const listPacks = catchAsync(async (_req: Request, res: Response) => {
  const result = await OfflinePackService.listPacks();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Offline packs listed successfully',
    data: result,
  });
});

// GET /offline-pack/coverage  (Admin: see 109-language DB records & pack readiness)
const getCoverage = catchAsync(async (_req: Request, res: Response) => {
  const result = await OfflinePackService.getCoverageMatrix();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Language coverage matrix retrieved successfully',
    data: result,
  });
});

// GET /offline-pack/available-languages (Public: mobile app discovers languages with live data)
const getAvailableLanguages = catchAsync(async (_req: Request, res: Response) => {
  const result = await OfflinePackService.getAvailableLanguages();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Available content languages retrieved successfully',
    data: result,
  });
});

export const OfflinePackController = {
  checkSync,
  downloadPack,
  generatePack,
  listPacks,
  getCoverage,
  getAvailableLanguages,
};

