import * as _ from 'lodash'
import { MergeInfo, default as mergeSchemas } from 'graphql-tools/dist/stitching/mergeSchemas'
import { GraphQLResolveInfo, GraphQLSchema } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'

interface ResolverDefinition {
  [key: string]: ResolverDefinition | ResolverMiddleware | ResolverMiddleware[]
}

interface ResolverMap { [path: string]: ResolverMiddleware[] }

interface ResolverContext {
  mergeInfo: MergeInfo
  parent: any
  args: { [argName: string]: any }
  context: any
  info: GraphQLResolveInfo
}

type ResolverMiddleware = (context: ResolverContext, next?: Promise<any>) => any | Promise<any>

interface StackOptions {
  typeDefs?: string
  schema?: GraphQLSchema
}

export class Stack {
  resolverMaps: ResolverMap[]
  typeDefs?: string
  schema?: GraphQLSchema
  constructor({typeDefs, schema}: StackOptions) {
    if (typeDefs && schema) {
      throw new Error(`Please use either 'typeDefs' or 'schema'.`)
    }
    this.typeDefs = typeDefs
    this.schema = schema
    this.resolverMaps = []
  }
  use(def: any) {
    const paths = this.getLeafPaths(def)
    const resolverMap = {}
    paths.forEach(path => {
      if (!_.get(this.resolverMaps, path)) {
        _.set(resolverMap, path, [])
      }
      const pointer = _.get(resolverMap, path)
      pointer.push(_.get(def, path))
    })
    this.resolverMaps.push(resolverMap)
  }
  getMergedResolverMap(): ResolverMap {
    const mergedResolverMap = {}
    this.resolverMaps.forEach(resolverMap => {
      const keys = this.getLeafPaths(resolverMap)
      // filter keys that are contained in other keys
      const leafKeys = keys.filter(k => !keys.find(k2 => k2 !== k && k2.includes(k)))
      leafKeys.forEach(path => {
        const currentResolversForPath = this.getResolversForPath(path, resolverMap)
        _.set(mergedResolverMap, path, currentResolversForPath)
      })
    })
    return mergedResolverMap
  }
  getResolvers() {
    const resolvers = {}
    const mergedResolverMap = this.getMergedResolverMap()
    const keys = this.getLeafPaths(mergedResolverMap)
    // filter keys that are contained in other keys
    const leafKeys = keys.filter(k => !keys.find(k2 => k2 !== k && k2.includes(k)))
    leafKeys.forEach(path => {
      const resolversForPath = this.getResolversForPath(path, mergedResolverMap)
      const mergedResolvers = this.mergeResolvers(resolversForPath)
      _.set(resolvers, path, mergedResolvers)
    })
    return resolvers
  }
  mergeResolvers(resolvers) {
    let input = {}
    const defaultResolver = (resolverInput) => {
      const mergedInput = {...input, ...resolverInput}
      const {info, parent} = mergedInput
      return parent ? parent[info.fieldName] : {}
    }
    const mappedResolvers = []
    for (let i = resolvers.length - 1; i >= 1; i--) {
      const resolver = resolvers[i]
      mappedResolvers[i] = resolverInput => {
        const mergedInput = {...input, ...resolverInput}
        return resolver(mergedInput, mappedResolvers[i+1] || defaultResolver)
      }
    }
    return (parent, args, context, info) => {
      input = {
        parent,
        args,
        context,
        info,
      }
      return resolvers[0](input, mappedResolvers[1] || defaultResolver)
    }
  }
  getResolversForPath(path: string, resolverMap: ResolverMap) {
    let resolvers = []
    const splittedPath = path.split('.')
    splittedPath.forEach((item, index) => {
      const currentPath = splittedPath.slice(0, index + 1).join('.')
      const currentResolvers = _.get(resolverMap, currentPath)
      if (currentResolvers && (Array.isArray(currentResolvers) || typeof currentResolvers === 'function')) {
        resolvers = resolvers.concat(currentResolvers)
      }
    })
    return _.flatten(resolvers)
  }
  getLeafPaths(tree) {
    const leaves = []
    const walk = function(obj: any, path?: string) {
      for (const n in obj) {
        if (obj.hasOwnProperty(n)) {
          if (typeof obj[n] === 'object' && !Array.isArray(obj[n])) {
            walk(obj[n], path ? path + '.' + n : n)
          } else {
            leaves.push(path ? path + '.' + n : n)
          }
        }
      }
    }
    walk(tree)
    return leaves
  }
  getSchema(): any {
    if (this.typeDefs) {
      return makeExecutableSchema({
        typeDefs: this.typeDefs,
        resolvers: this.getResolvers()
      })
    } else if (this.schema) {
      return mergeSchemas({
        schemas: [this.schema],
        resolvers: () => this.getResolvers()
      })
    }
  }
}
