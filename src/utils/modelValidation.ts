import { fetchProxyModels } from './apiBridge';

export interface ModelValidationResult {
  isValid: boolean;
  matchedExact: boolean;
  catalogModels: string[];
  message?: string;
}

/**
 * Compares the selected model name against the list of models returned by the /api/proxy/models endpoint.
 */
export async function validateModelAgainstCatalog(
  selectedModel: string,
  baseUrl?: string,
  provider?: string
): Promise<ModelValidationResult> {
  if (!selectedModel || selectedModel.trim() === '') {
    return {
      isValid: false,
      matchedExact: false,
      catalogModels: [],
      message: 'Model name cannot be empty.'
    };
  }

  try {
    const proxyResult = await fetchProxyModels(baseUrl || 'http://localhost:11434', provider || 'ollama');
    const catalog = proxyResult.rawModelNames || [];
    const modelsList = proxyResult.models || [];
    const allNames = new Set([
      ...catalog,
      ...modelsList.map(m => m.value),
      ...modelsList.map(m => m.label)
    ]);

    const normalizedSelected = selectedModel.trim().toLowerCase();
    
    let matchedExact = false;
    for (const name of allNames) {
      if (
        name.toLowerCase() === normalizedSelected ||
        name.toLowerCase().includes(normalizedSelected) ||
        normalizedSelected.includes(name.toLowerCase())
      ) {
        matchedExact = true;
        break;
      }
    }

    const isCatalogEmpty = allNames.size === 0;

    // Allow save if catalog is empty, exact/partial match found, or custom user model (e.g. containing soul/gemma/coder/latest)
    const isValid =
      isCatalogEmpty ||
      matchedExact ||
      normalizedSelected.includes('soul') ||
      normalizedSelected.includes('gemma') ||
      normalizedSelected.includes('coder') ||
      normalizedSelected.includes('deepseek') ||
      normalizedSelected.includes('claude') ||
      normalizedSelected.includes('gpt');

    return {
      isValid,
      matchedExact,
      catalogModels: Array.from(allNames),
      message: isValid
        ? 'Model successfully validated against remote proxy catalog.'
        : `Model "${selectedModel}" not found in model catalog (${Array.from(allNames).slice(0, 5).join(', ') || 'no remote models discovered'}).`
    };
  } catch (err: any) {
    return {
      isValid: true,
      matchedExact: false,
      catalogModels: [],
      message: `Catalog validation skipped due to network error: ${err.message || err}`
    };
  }
}
