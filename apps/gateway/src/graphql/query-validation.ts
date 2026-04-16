import {
  GraphQLError,
  Kind,
  type ASTVisitor,
  type FieldNode,
  type OperationDefinitionNode,
  type ValidationContext,
  type ValidationRule,
} from "graphql"

export type GatewayValidationLimits = {
  maxDepth: number
  maxComplexity: number
  maxAliases: number
}

function createDepthValidationRule(maxDepth: number): ValidationRule {
  return (context: ValidationContext): ASTVisitor => {
    let currentDepth = 0
    let maxObservedDepth = 0

    return {
      Field: {
        enter(node: FieldNode) {
          if (node.name.value.startsWith("__")) {
            return
          }

          currentDepth += 1
          maxObservedDepth = Math.max(maxObservedDepth, currentDepth)
        },
        leave(node: FieldNode) {
          if (node.name.value.startsWith("__")) {
            return
          }

          currentDepth -= 1
        },
      },
      OperationDefinition: {
        leave(node: OperationDefinitionNode) {
          if (maxObservedDepth > maxDepth) {
            context.reportError(
              new GraphQLError(
                `GraphQL query depth ${maxObservedDepth} exceeds maximum allowed depth ${maxDepth}`,
                { nodes: node }
              )
            )
          }

          currentDepth = 0
          maxObservedDepth = 0
        },
      },
    }
  }
}

function createComplexityValidationRule(maxComplexity: number, maxAliases: number): ValidationRule {
  return (context: ValidationContext): ASTVisitor => {
    let fieldCount = 0
    let aliasCount = 0

    return {
      Field(node: FieldNode) {
        if (node.name.value.startsWith("__")) {
          return
        }

        fieldCount += 1
        if (node.alias) {
          aliasCount += 1
        }
      },
      OperationDefinition: {
        leave(node: OperationDefinitionNode) {
          if (fieldCount > maxComplexity) {
            context.reportError(
              new GraphQLError(
                `GraphQL query complexity ${fieldCount} exceeds maximum allowed complexity ${maxComplexity}`,
                { nodes: node }
              )
            )
          }

          if (aliasCount > maxAliases) {
            context.reportError(
              new GraphQLError(
                `GraphQL query aliases ${aliasCount} exceed maximum allowed aliases ${maxAliases}`,
                { nodes: node }
              )
            )
          }

          fieldCount = 0
          aliasCount = 0
        },
      },
    }
  }
}

export function buildGatewayValidationRules(limits: GatewayValidationLimits): ValidationRule[] {
  return [
    createDepthValidationRule(limits.maxDepth),
    createComplexityValidationRule(limits.maxComplexity, limits.maxAliases),
  ]
}
