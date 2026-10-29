import { publishedContentFilter } from './content-publication'
import crypto from 'crypto'
import { Model } from 'mongoose'
import { Request, Response } from 'express'
import catchAsync from '../../../shared/catchAsync'
import ApiError from '../../../errors/ApiError'
import { Hadith } from '../hadith/hadith.model'
import { Dua } from '../dua/dua.model'
import { KnowledgeArticle } from '../knowledge-library/knowledge-library.model'
import { KnowledgeBook } from '../knowledge-library/knowledge-book.model'
import { KnowledgeFatwa } from '../knowledge-library/knowledge-fatwa.model'
import { Tafsir } from '../tafsir/tafsir.model'

// A fingerprint includes deleted/inactive rows. Unlike MAX(row.version), every
// create/edit/delete changes it, and an empty collection is a valid snapshot.
export const contentModels: Record<string, Model<any>> = {
  // eslint-disable-line @typescript-eslint/no-explicit-any
  hadith: Hadith,
  dua: Dua,
  knowledge: KnowledgeArticle,
  book: KnowledgeBook,
  fatwa: KnowledgeFatwa,
  tafsir: Tafsir,
}
export const snapshotRevision = (rows: unknown[]) =>
  crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex')
export const readScopedContentRevision = async (
  model: Model<any>,
  scope: Record<string, unknown>,
) => {
  // eslint-disable-line @typescript-eslint/no-explicit-any
  // Hash each complete record inside MongoDB, then transfer one summary rather
  // than tens of thousands of metadata records for every download page.
  const summary = await model.aggregate([
    { $match: scope },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        fingerprint: { $sum: { $toDecimal: { $toHashedIndexKey: '$$ROOT' } } },
      },
    },
  ])
  return snapshotRevision(summary)
}
export const readContentRevision = (model: Model<any>, lang: string) =>
  readScopedContentRevision(model, { lang }) // eslint-disable-line @typescript-eslint/no-explicit-any

export const getContentSnapshot = catchAsync(
  async (req: Request, res: Response) => {
    const model = contentModels[req.params.module]
    const lang = String(req.query.lang || 'en')
    if (!model || !/^[a-z]{2,3}(-[a-zA-Z0-9]+)*$/.test(lang))
      throw new ApiError(400, 'Invalid content scope')
    const page = Math.max(1, Math.trunc(Number(req.query.page) || 1))
    const limit = Math.min(
      1000,
      Math.max(1, Math.trunc(Number(req.query.limit) || 500)),
    )
    const readRevision = () => readContentRevision(model, lang)
    const revision = await readRevision()
    if (req.query.revision && req.query.revision !== revision)
      throw new ApiError(
        409,
        'Content changed during download; retry the snapshot',
      )
    const filter = publishedContentFilter(req.params.module, lang)
    const total = await model.countDocuments(filter)
    if (req.query.metadata === 'true') {
      res.json({
        success: true,
        data: [],
        meta: {
          page: 1,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          revision,
          lang,
          module: req.params.module,
        },
      })
      return
    }
    let query = model
      .find(filter)
      .sort({ _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
    // Preserve already downloaded book bodies on mobile; reading a new book fetches
    // its body explicitly. Listing every book must not download an entire library.
    if (req.params.module === 'book') query = query.select('-content')
    const rows = await query.lean()
    if (revision !== (await readRevision()))
      throw new ApiError(
        409,
        'Content changed during download; retry the snapshot',
      )
    res.json({
      success: true,
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        revision,
        lang,
        module: req.params.module,
      },
    })
  },
)
