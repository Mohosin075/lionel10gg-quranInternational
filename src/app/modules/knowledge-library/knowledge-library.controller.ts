import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { KnowledgeLibraryServices } from './knowledge-library.service';

const getAllArticles = catchAsync(async (req: Request, res: Response) => {
  const lang = (req.query.lang as string) || 'de'; // Default to German ('de')
  const category = req.query.category as string;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await KnowledgeLibraryServices.getAllArticles(lang, category, page, limit);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Articles fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getArticleById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await KnowledgeLibraryServices.getArticleById(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Article fetched successfully',
    data: result,
  });
});

const createArticle = catchAsync(async (req: Request, res: Response) => {
  const result = await KnowledgeLibraryServices.createArticle(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Article created successfully',
    data: result,
  });
});

const updateArticle = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await KnowledgeLibraryServices.updateArticle(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Article updated successfully',
    data: result,
  });
});

const deleteArticle = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await KnowledgeLibraryServices.deleteArticle(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Article deleted successfully',
    data: result,
  });
});

const getVersion = catchAsync(async (req: Request, res: Response) => {
  const lang = (req.query.lang as string) || 'de';
  const result = await KnowledgeLibraryServices.getVersion(lang);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Knowledge version fetched successfully',
    data: { lang, version: result },
  });
});

const checkSync = catchAsync(async (req: Request, res: Response) => {
  const lang = (req.query.lang as string) || 'de';
  const { version } = req.query;
  const result = await KnowledgeLibraryServices.checkSyncMetadata(lang, Number(version) || 0);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Knowledge sync status checked successfully',
    data: result,
  });
});

const downloadSync = catchAsync(async (req: Request, res: Response) => {
  const lang = (req.query.lang as string) || 'de';
  const { fromVersion } = req.query;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 500;

  const result = await KnowledgeLibraryServices.getSyncData(
    lang,
    Number(fromVersion) || 0,
    page,
    limit,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Knowledge sync data fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

// ==========================================
// BOOKS CONTROLLERS
// ==========================================
const getAllBooks = catchAsync(async (req: Request, res: Response) => {
  const lang = (req.query.lang as string) || 'de';
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const result = await KnowledgeLibraryServices.getAllBooks(lang, page, limit);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Books fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getBookById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await KnowledgeLibraryServices.getBookById(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Book fetched successfully',
    data: result,
  });
});

const createBook = catchAsync(async (req: Request, res: Response) => {
  const result = await KnowledgeLibraryServices.createBook(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Book created successfully',
    data: result,
  });
});

const updateBook = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await KnowledgeLibraryServices.updateBook(id, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Book updated successfully',
    data: result,
  });
});

const deleteBook = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await KnowledgeLibraryServices.deleteBook(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Book deleted successfully',
    data: result,
  });
});

// ==========================================
// FATWAS CONTROLLERS
// ==========================================
const getAllFatwas = catchAsync(async (req: Request, res: Response) => {
  const lang = (req.query.lang as string) || 'de';
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const result = await KnowledgeLibraryServices.getAllFatwas(lang, page, limit);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Fatwas fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getFatwaById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await KnowledgeLibraryServices.getFatwaById(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Fatwa fetched successfully',
    data: result,
  });
});

const createFatwa = catchAsync(async (req: Request, res: Response) => {
  const result = await KnowledgeLibraryServices.createFatwa(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Fatwa created successfully',
    data: result,
  });
});

const updateFatwa = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await KnowledgeLibraryServices.updateFatwa(id, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Fatwa updated successfully',
    data: result,
  });
});

const deleteFatwa = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await KnowledgeLibraryServices.deleteFatwa(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Fatwa deleted successfully',
    data: result,
  });
});

export const KnowledgeLibraryController = {
  getAllArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  getVersion,
  checkSync,
  downloadSync,
  // Books
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  // Fatwas
  getAllFatwas,
  getFatwaById,
  createFatwa,
  updateFatwa,
  deleteFatwa,
};
