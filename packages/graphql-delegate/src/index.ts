import {
  introspectSchema,
  makeRemoteExecutableSchema,
  mergeSchemas,
} from 'graphql-tools'
import {
  DefinitionNode,
  DocumentNode,
  GraphQLResolveInfo,
  GraphQLSchema,
  ObjectTypeDefinitionNode,
  parse,
  print,
  printSchema,
} from 'graphql'
import { ApolloLink } from 'apollo-link'
import { MergeInfo } from 'graphql-tools/dist/stitching/mergeSchemas'
import * as _ from 'lodash'

export type Delegator = (
  type: 'query' | 'mutation',
  fieldName: string,
  args: { [key: string]: any },
  context: { [key: string]: any },
  info: GraphQLResolveInfo,
) => any

export interface DefinitionMap {
  [key: string]: DefinitionNode
}

const builtinTypes = ['String', 'Float', 'Int', 'Boolean', 'ID']

export class Delegate {
  link: ApolloLink
  schema: GraphQLSchema
  mergeInfo: MergeInfo

  constructor(link: ApolloLink) {
    this.link = link
  }

  init(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const { link } = this
      this.schema = makeRemoteExecutableSchema({
        schema: await introspectSchema(link),
        link,
      })
      mergeSchemas({
        schemas: [this.schema],
        resolvers: mergeInfo => {
          this.mergeInfo = mergeInfo
          resolve()
          return {}
        },
      })
    })
  }

  extractMissingTypes(typeDefs: string): string {
    let patchedTypeDef = this.extractMissingTypesStep(typeDefs)
    let count = 0
    // do a maximum of 50 iterations to ensure no recursive call is being executed
    while (count < 50) {
      const newTypeDef = this.extractMissingTypesStep(patchedTypeDef)
      if (newTypeDef === patchedTypeDef) {
        return newTypeDef
      }
      patchedTypeDef = newTypeDef
      count++
    }
    return patchedTypeDef
  }

  getDelegator(): Delegator {
    return this.mergeInfo.delegate
  }

  private extractMissingTypesStep(typeDefs: string): string {
    const baseSchemaIdl = printSchema(this.schema)
    const baseSchemaAst = parse(baseSchemaIdl)

    const customSchemaAst = parse(typeDefs)
    this.patchMissingTypes(customSchemaAst, baseSchemaAst)

    return print(customSchemaAst)
  }

  private patchMissingTypes(
    definitionsAst: DocumentNode,
    schemaAst: DocumentNode,
  ) {
    const schemaMap: DefinitionMap = _.keyBy(
      schemaAst.definitions,
      (d: any) => d.name.value,
    )
    definitionsAst.definitions.forEach(def =>
      this.patchDefinition(definitionsAst, def, schemaMap),
    )
  }

  private getDeeperType(type: any, depth: number = 0): any {
    if (depth < 5) {
      if (type.ofType) {
        return this.getDeeperType(type.ofType, depth + 1)
      } else if (type.type) {
        return this.getDeeperType(type.type, depth + 1)
      }
    }
    return type
  }

  private patchDefinition(
    definitionsAst: DocumentNode,
    definition: DefinitionNode,
    schemaMap: DefinitionMap,
  ) {
    if (definition.kind === 'ObjectTypeDefinition') {
      const def: ObjectTypeDefinitionNode = definition
      def.fields.forEach(field => {
        const deeperType = this.getDeeperType(field.type)
        if (deeperType.kind === 'NamedType') {
          const typeName = deeperType.name.value
          field.arguments.forEach(argument => {
            const argType = this.getDeeperType(argument)
            const argTypeName = argType.name.value
            if (
              !definitionsAst.definitions.find(
                (d: any) => d.name && d.name.value === argTypeName,
              ) &&
              !builtinTypes.includes(argTypeName)
            ) {
              const argTypeMatch = schemaMap[argTypeName]
              if (!argTypeMatch) {
                throw new Error(
                  `Field ${field.name
                    .value}: Couldn't find type ${argTypeName} of args in typeDefinitions or baseSchema.`,
                )
              }
              definitionsAst.definitions.push(argTypeMatch)
            }
          })
          if (
            !definitionsAst.definitions.find(
              (d: any) => d.name && d.name.value === typeName,
            ) &&
            !builtinTypes.includes(typeName)
          ) {
            const schemaType: ObjectTypeDefinitionNode = schemaMap[
              typeName
              ] as ObjectTypeDefinitionNode
            if (!schemaType) {
              throw new Error(
                `Field ${field.name
                  .value}: Couldn't find type ${typeName} in typeDefinitions or baseSchema.`,
              )
            }
            definitionsAst.definitions.push(schemaType)
            if (schemaType.interfaces) {
              schemaType.interfaces.forEach(i => {
                const name = i.name.value
                const exists = definitionsAst.definitions.find(
                  (d: any) => d.name && d.name.value === name,
                )
                if (!exists) {
                  const interfaceType = schemaMap[name]
                  if (!interfaceType) {
                    throw new Error(
                      `Field ${field.name
                        .value}: Couldn't find interface ${name} in baseSchema for type ${typeName}.`,
                    )
                  }
                  definitionsAst.definitions.push(interfaceType)
                }
              })
            }
          }
        }
      })
    }
  }
}
