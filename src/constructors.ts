import { MiddlewareGenerator } from './generator'
import { IMiddlewareGenerator, IMiddlewareGeneratorConstructor } from './types'

export function middleware<TSource = any, TContext = any, TArgs = any>(
  generator: IMiddlewareGeneratorConstructor<TSource, TContext, TArgs>,
): IMiddlewareGenerator<TSource, TContext, TArgs> {
  return new MiddlewareGenerator(generator)
}
