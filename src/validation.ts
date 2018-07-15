import { GraphQLSchema, GraphQLObjectType, GraphQLInterfaceType } from 'graphql'
import { IMiddleware } from './types'
import { isMiddlewareFunction } from './utils'

export function validateMiddleware<TSource, TContext, TArgs>(
  schema: GraphQLSchema,
  middleware: IMiddleware<TSource, TContext, TArgs>,
): IMiddleware<TSource, TContext, TArgs> {
  if (isMiddlewareFunction(middleware)) {
    return middleware
  }

  const types = schema.getTypeMap()

  Object.keys(middleware).forEach(type => {
    if (!Object.keys(types).includes(type)) {
      throw new MiddlewareError(
        `Type ${type} exists in middleware but is missing in Schema.`,
      )
    }

    if (!isMiddlewareFunction(middleware[type])) {
      const fields = (types[type] as
        | GraphQLObjectType
        | GraphQLInterfaceType).getFields()

      Object.keys(middleware[type]).forEach(field => {
        if (!Object.keys(fields).includes(field)) {
          throw new MiddlewareError(
            `Field ${type}.${field} exists in middleware but is missing in Schema.`,
          )
        }

        if (!isMiddlewareFunction(middleware[type][field])) {
          throw new MiddlewareError(
            `Expected ${type}.${field} to be a function but found ` +
              typeof middleware[type][field],
          )
        }
      })
    }
  })

  return middleware
}

export class MiddlewareError extends Error {
  constructor(...props) {
    super(...props)
  }
}
