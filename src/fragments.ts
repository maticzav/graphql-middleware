import { FragmentReplacement, IResolvers } from './types'

export function extractFragmentReplacements(
  resolvers: IResolvers,
): FragmentReplacement[] {
  const fragmentReplacements: FragmentReplacement[] = []

  for (const typeName in resolvers) {
    const fieldResolvers: any = resolvers[typeName]
    for (const fieldName in fieldResolvers) {
      const fieldResolver = fieldResolvers[fieldName]
      if (typeof fieldResolver === 'object' && fieldResolver.fragment) {
        fragmentReplacements.push({
          field: fieldName,
          fragment: fieldResolver.fragment,
        })
      }
      if (typeof fieldResolver === 'object' && fieldResolver.fragments) {
        for (const fragmentKey in fieldResolver.fragments) {
          fragmentReplacements.push({
            field: fieldName,
            fragment: fieldResolver.fragments[fragmentKey],
          })
        }
      }
    }
  }

  return fragmentReplacements
}
