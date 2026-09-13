/**
 * Tool: OpenAPI / Swagger Specification Importer
 * Section 7.2 of Technical Specification.
 * Dynamically parses OpenAPI/Swagger specifications and generates Custom Action Nodes.
 */

import React, { useState } from 'react';
import { FileCode, CheckCircle2, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { WorkflowNode } from '../../engine/types';

interface OpenApiImporterProps {
  onAddGeneratedNode: (node: WorkflowNode) => void;
  onClose: () => void;
}

const SAMPLE_OPENAPI_SPEC = JSON.stringify(
  {
    openapi: '3.0.0',
    info: {
      title: 'HubSpot & CRM API Spec',
      version: '1.0.0',
    },
    servers: [{ url: 'https://api.hubapi.com/crm/v3' }],
    paths: {
      '/objects/contacts': {
        post: {
          summary: 'Criar Novo Contato',
          operationId: 'createContact',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string' },
                    firstname: { type: 'string' },
                    lastname: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      '/objects/deals': {
        post: {
          summary: 'Criar Oportunidade / Deal',
          operationId: 'createDeal',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    dealname: { type: 'string' },
                    amount: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  null,
  2
);

export const OpenApiImporter: React.FC<OpenApiImporterProps> = ({
  onAddGeneratedNode,
  onClose,
}) => {
  const [specInput, setSpecInput] = useState(SAMPLE_OPENAPI_SPEC);
  const [parsedEndpoints, setParsedEndpoints] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleParseSpec = () => {
    setError(null);
    try {
      const parsed = JSON.parse(specInput);
      const serverUrl = parsed.servers?.[0]?.url || 'https://api.exemplo.com';
      const endpoints: any[] = [];

      if (parsed.paths) {
        for (const [path, methods] of Object.entries(parsed.paths as Record<string, any>)) {
          for (const [method, details] of Object.entries((methods || {}) as Record<string, any>)) {
            endpoints.push({
              path,
              method: method.toUpperCase(),
              summary: details.summary || details.operationId || `${method.toUpperCase()} ${path}`,
              fullUrl: `${serverUrl}${path}`,
              schemaProps: details.requestBody?.content?.['application/json']?.schema?.properties || {},
            });
          }
        }
      }

      if (endpoints.length === 0) {
        throw new Error('Nenhuma rota ou método encontrado no arquivo OpenAPI.');
      }

      setParsedEndpoints(endpoints);
    } catch (err: any) {
      setError(`Erro ao analisar OpenAPI Spec: ${err.message}`);
    }
  };

  const handleGenerateNode = (ep: any) => {
    const defaultBody: Record<string, string> = {};
    for (const key of Object.keys(ep.schemaProps)) {
      defaultBody[key] = `{{input.${key}}}`;
    }

    const newNode: WorkflowNode = {
      id: `openapi_${Date.now().toString(36)}`,
      type: 'customNode',
      position: { x: 300, y: 250 },
      data: {
        label: ep.summary,
        type: 'http_request',
        config: {
          method: ep.method,
          url: ep.fullUrl,
          headers: [{ key: 'Content-Type', value: 'application/json' }],
          authType: 'credential',
          bodyType: 'json',
          jsonBody: JSON.stringify(defaultBody, null, 2),
          timeoutMs: 8000,
        },
        isValidConfig: true,
      },
    };

    onAddGeneratedNode(newNode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        style={{ backgroundColor: '#0a0a0a' }}
        className="w-full max-w-3xl rounded-xl border border-[#171717] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#171717] bg-[#0c0c0c]">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2 tracking-tight">
              <FileCode className="w-4 h-4 text-blue-400" />
              <span>Importador Dinâmico OpenAPI / Swagger</span>
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5 tracking-tight">
              Gere nós de ação customizada a partir de especificações REST sem precisar programar
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-xs px-2.5 py-1 rounded-[6px] bg-[#1a1a1a] border border-[#262626] transition-colors"
          >
            Fechar
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Cole a especificação OpenAPI (JSON)
              </label>
              <button
                type="button"
                onClick={() => setSpecInput(SAMPLE_OPENAPI_SPEC)}
                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Usar Exemplo (HubSpot)
              </button>
            </div>
            <textarea
              rows={8}
              value={specInput}
              onChange={(e) => setSpecInput(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[6px] p-3 text-zinc-200 font-mono text-xs focus:border-zinc-600 outline-none"
            />
          </div>

          <button
            onClick={handleParseSpec}
            className="w-full py-2 px-4 rounded-[6px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            Analisar Especificação
          </button>

          {error && (
            <div className="p-3 rounded-[6px] bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {parsedEndpoints.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-[#171717]">
              <h4 className="text-xs font-semibold text-zinc-300 tracking-tight">
                Endpoints Encontrados ({parsedEndpoints.length}) — Clique para gerar nó:
              </h4>

              <div className="space-y-2">
                {parsedEndpoints.map((ep, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleGenerateNode(ep)}
                    className="p-3 rounded-[6px] bg-[#111111] border border-[#171717] hover:border-blue-500/60 transition-colors cursor-pointer group flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-[6px] bg-blue-950 text-blue-400 border border-blue-900">
                          {ep.method}
                        </span>
                        <span className="text-xs font-semibold text-zinc-200 group-hover:text-blue-400 transition-colors">
                          {ep.summary}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-zinc-500 mt-1">{ep.fullUrl}</div>
                    </div>

                    <div className="p-1.5 rounded-[6px] bg-zinc-900 group-hover:bg-blue-600 text-zinc-400 group-hover:text-white transition-all">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
