// tool-registry.mjs — Central registry of all automation tools
// Each tool follows the interface: { name, category, displayName, icon, description, input_schema, requiredSecrets, execute }
// Adding a new tool: 1) create tools/xxx.mjs, 2) import + register here, 3) add secrets to Secrets Manager, 4) redeploy

import { sendEmailTool } from './tools/email.mjs';
import { sendTeamsMessageTool } from './tools/teams.mjs';
import { readExcelTool, writeExcelTool } from './tools/excel.mjs';
import { callApiTool } from './tools/http.mjs';

// ============ FULL TOOL LIST ============
const ALL_TOOLS = [
  sendEmailTool,
  sendTeamsMessageTool,
  readExcelTool,
  writeExcelTool,
  callApiTool,
];

// ============ PUBLIC API ============

/**
 * Get all registered tools
 */
export function getAllTools() {
  return ALL_TOOLS;
}

/**
 * Get tools filtered by available secrets (only return tools whose secrets are configured)
 */
export function getAvailableTools(secrets) {
  return ALL_TOOLS.filter(tool => {
    if (!tool.requiredSecrets || tool.requiredSecrets.length === 0) return true;
    return tool.requiredSecrets.every(key => secrets[key]);
  });
}

/**
 * Get a tool by name
 */
export function getToolByName(name) {
  return ALL_TOOLS.find(t => t.name === name) || null;
}

/**
 * Get Claude tool definitions (for tools[] parameter in API call)
 */
export function getClaudeToolDefinitions(tools) {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));
}

/**
 * Get tool catalog for display (frontend / system prompt)
 */
export function getToolCatalog() {
  return ALL_TOOLS.map(t => ({
    name: t.name,
    category: t.category,
    displayName: t.displayName,
    icon: t.icon,
    description: t.description,
    requiredSecrets: t.requiredSecrets,
    inputSchema: t.input_schema,
  }));
}
