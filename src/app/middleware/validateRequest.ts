import { NextFunction, Request, Response } from 'express'
import { AnyZodObject, ZodEffects } from 'zod'

const validateRequest =
  (schema: AnyZodObject | ZodEffects<AnyZodObject>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      })
      req.body = parsed.body
      if (parsed.query) req.query = parsed.query
      if (parsed.params) req.params = parsed.params
      if (parsed.cookies) req.cookies = parsed.cookies
      return next()
    } catch (error) {
      next(error)
    }
  }

export default validateRequest
