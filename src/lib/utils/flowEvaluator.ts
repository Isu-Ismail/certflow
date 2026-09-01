import type { StudentRecord, CertificateTemplate, GeneratedCertificate, ConditionRule } from '../types';
import type { Node, Edge } from '@xyflow/svelte';

export interface RouteResult {
  template: CertificateTemplate;
  students: StudentRecord[];
}

export function evaluateCondition(student: StudentRecord, rule: ConditionRule): boolean {
  if (!rule || !rule.field) return true;
  
  const rawValue = student[rule.field];
  if (rawValue === undefined || rawValue === null) return false;
  
  const studentValStr = String(rawValue).trim().toLowerCase();
  const ruleValStr = String(rule.value).trim().toLowerCase();

  const numStudent = Number(rawValue);
  const numRule = Number(rule.value);
  const isNumeric = !isNaN(numStudent) && !isNaN(numRule);

  switch (rule.operator) {
    case '==':
      return studentValStr === ruleValStr;
    case '!=':
      return studentValStr !== ruleValStr;
    case '>':
      return isNumeric ? numStudent > numRule : studentValStr > ruleValStr;
    case '<':
      return isNumeric ? numStudent < numRule : studentValStr < ruleValStr;
    case '>=':
      return isNumeric ? numStudent >= numRule : studentValStr >= ruleValStr;
    case '<=':
      return isNumeric ? numStudent <= numRule : studentValStr <= ruleValStr;
    case 'contains':
      return studentValStr.includes(ruleValStr);
    case 'startsWith':
      return studentValStr.startsWith(ruleValStr);
    default:
      return false;
  }
}

export function generateCertificatesFromFlow(
  records: StudentRecord[],
  nodes: Node[],
  edges: Edge[],
  templates: CertificateTemplate[]
): GeneratedCertificate[] {
  const templateMap = new Map<string, CertificateTemplate>();
  templates.forEach(t => templateMap.set(t.id, t));

  const results: GeneratedCertificate[] = [];

  // Find Data Source node
  const sourceNode = nodes.find(n => n.type === 'dataSource');
  if (!sourceNode) {
    // Fallback: If no flow defined, assign default template to all
    const defaultTpl = templates[0];
    if (!defaultTpl) return [];
    return records.map(student => ({
      id: `gen_${student.id}_${Date.now()}`,
      student,
      template: defaultTpl,
      generatedAt: new Date().toISOString()
    }));
  }

  // Traversal for each student
  for (const student of records) {
    let currentNodeId: string | null = sourceNode.id;
    let assignedTemplate: CertificateTemplate | null = null;
    let visitedNodes = new Set<string>();

    while (currentNodeId && !assignedTemplate && !visitedNodes.has(currentNodeId)) {
      visitedNodes.add(currentNodeId);
      const currNode = nodes.find(n => n.id === currentNodeId);
      if (!currNode) break;

      if (currNode.type === 'templateNode') {
        const tId = currNode.data?.templateId as string;
        assignedTemplate = templateMap.get(tId) || templates[0] || null;
        break;
      }

      if (currNode.type === 'dataSource') {
        // Find outgoing edge from dataSource
        const outEdge = edges.find(e => e.source === currentNodeId);
        currentNodeId = outEdge ? outEdge.target : null;
      } else if (currNode.type === 'condition') {
        const rule = currNode.data?.rule as ConditionRule;
        const passed = evaluateCondition(student, rule);
        const targetHandle = passed ? 'true' : 'false';

        // Find outgoing edge for matching handle
        const matchingEdge = edges.find(e => e.source === currentNodeId && (e.sourceHandle === targetHandle || (!e.sourceHandle && passed)));
        if (matchingEdge) {
          currentNodeId = matchingEdge.target;
        } else {
          // If no edge matched for condition, check for any edge from source
          const fallbackEdge = edges.find(e => e.source === currentNodeId);
          currentNodeId = fallbackEdge ? fallbackEdge.target : null;
        }
      } else {
        break;
      }
    }

    // Fallback if record reached no template
    if (!assignedTemplate && templates.length > 0) {
      assignedTemplate = templates[0];
    }

    if (assignedTemplate) {
      results.push({
        id: `gen_${student.id}_${assignedTemplate.id}`,
        student,
        template: assignedTemplate,
        generatedAt: new Date().toISOString()
      });
    }
  }

  return results;
}
