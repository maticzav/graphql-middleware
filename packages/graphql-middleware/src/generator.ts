import {
  IMiddlewareGeneratorConstructor,
  IMiddleware,
  IMiddlewareGenerator,
} from './types'
import { GraphQLSchema } from 'graphql'

export class MiddlewareGenerator<TSource, TContext, TArgs>
  implements IMiddlewareGenerator<TSource, TContext, TArgs> {
  private generator: IMiddlewareGeneratorConstructor<TSource, TContext, TArgs>

  constructor(
    generator: IMiddlewareGeneratorConstructor<TSource, TContext, TArgs>,
  ) {
    this.generator = generator
  }

  generate(schema: GraphQLSchema): IMiddleware<TSource, TContext, TArgs> {
    return this.generator(schema)
  }
}
