import {
  Kind,
  parse,
  InlineFragmentNode,
  OperationDefinitionNode,
  print,
} from 'graphql'
import { FragmentReplacement, IResolvers } from './types'

export function extractFragmentReplacements(
  resolvers: IResolvers,
): FragmentReplacement[] {
  const allFragmentReplacements: FragmentReplacement[] = []

  /* Collect fragments */
  for (const typeName in resolvers) {
    const fieldResolvers: any = resolvers[typeName]
    for (const fieldName in fieldResolvers) {
      const fieldResolver = fieldResolvers[fieldName]
      if (typeof fieldResolver === 'object' && fieldResolver.fragment) {
        allFragmentReplacements.push({
          field: fieldName,
          fragment: fieldResolver.fragment,
        })
      }
      if (typeof fieldResolver === 'object' && fieldResolver.fragments) {
        for (const fragmentKey in fieldResolver.fragments) {
          allFragmentReplacements.push({
            field: fieldName,
            fragment: fieldResolver.fragments[fragmentKey],
          })
        }
      }
    }
  }

  /* Filter and map circular dependencies */

  const fragmentReplacements = allFragmentReplacements
    .map(fragmentReplacement => {
      const fragment = parseFragmentToInlineFragment(
        fragmentReplacement.fragment,
      )

      const newSelections = fragment.selectionSet.selections.filter(node => {
        switch (node.kind) {
          case 'Field': {
            return node.name.value !== fragmentReplacement.field
          }
          default: {
            return true
          }
        }
      })

      if (newSelections.length === 0) {
        return null
      }

      const newFragment: InlineFragmentNode = {
        ...fragment,
        selectionSet: {
          kind: fragment.selectionSet.kind,
          loc: fragment.selectionSet.loc,
          selections: newSelections,
        },
      }

      const parsedFragment = print(newFragment)

      return {
        field: fragmentReplacement.field,
        fragment: parsedFragment,
      }
    })
    .filter(fr => fr !== null)

  return fragmentReplacements

  /* Helper functions */

  function parseFragmentToInlineFragment(
    definitions: string,
  ): InlineFragmentNode {
    if (definitions.trim().startsWith('fragment')) {
      const document = parse(definitions)
      for (const definition of document.definitions) {
        if (definition.kind === Kind.FRAGMENT_DEFINITION) {
          return {
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: definition.typeCondition,
            selectionSet: definition.selectionSet,
          }
        }
      }
    }

    const query = parse(`{${definitions}}`)
      .definitions[0] as OperationDefinitionNode
    for (const selection of query.selectionSet.selections) {
      if (selection.kind === Kind.INLINE_FRAGMENT) {
        return selection
      }
    }

    throw new Error('Could not parse fragment')
  }
}
