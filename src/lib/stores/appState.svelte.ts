import type { Dataset, CertificateTemplate, GeneratedCertificate, AssetFile } from '../types';
import { SAMPLE_DATASETS } from '../utils/excelParser';
import type { Node, Edge } from '@xyflow/svelte';

// Default starter certificate templates with beautiful styling
export const DEFAULT_TEMPLATES: CertificateTemplate[] = [
  {
    id: 'tpl_gold_excellence',
    name: 'Gold Excellence Award',
    description: 'Luxury certificate with gold classic border for top rankers (Position == 1)',
    badgeColor: '#EAB308',
    width: 1056,
    height: 747,
    aspectRatioName: 'A4 Landscape',
    backgroundColor: '#0F172A',
    borderColor: '#EAB308',
    secondaryBorderColor: '#FACC15',
    borderWidth: 12,
    borderPadding: 16,
    borderStyle: 'gold-classic',
    elements: [
      {
        id: 'el_header_badge',
        type: 'text',
        x: 50,
        y: 12,
        content: '★ FIRST PLACE WINNER ★',
        fontSize: 16,
        fontWeight: 'bold',
        color: '#EAB308',
        textAlign: 'center',
        letterSpacing: 4
      },
      {
        id: 'el_title',
        type: 'text',
        x: 50,
        y: 22,
        content: 'CERTIFICATE OF EXCELLENCE',
        fontSize: 38,
        fontFamily: 'serif',
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: 3
      },
      {
        id: 'el_subtitle',
        type: 'text',
        x: 50,
        y: 35,
        content: 'THIS CERTIFICATE IS PROUDLY PRESENTED TO',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#CBD5E1',
        textAlign: 'center',
        letterSpacing: 2
      },
      {
        id: 'el_name',
        type: 'text',
        x: 50,
        y: 48,
        content: '{Name}',
        fontSize: 44,
        fontFamily: 'serif',
        fontWeight: 'bold',
        color: '#FACC15',
        textAlign: 'center'
      },
      {
        id: 'el_body',
        type: 'text',
        x: 50,
        y: 63,
        content: 'For outstanding performance securing Position #{Position} in {Project_Name} ({Track}) with a score of {Score}/100.',
        fontSize: 18,
        fontWeight: 'normal',
        color: '#E2E8F0',
        textAlign: 'center'
      },
      {
        id: 'el_date',
        type: 'text',
        x: 25,
        y: 83,
        content: 'Issued on: {Issue_Date}',
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center'
      },
      {
        id: 'el_cert_id',
        type: 'text',
        x: 75,
        y: 83,
        content: 'ID: {Certificate_ID}',
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center'
      }
    ]
  },
  {
    id: 'tpl_standard_completion',
    name: 'Official Achievement Certificate',
    description: 'Clean modern certificate for participants and graduates',
    badgeColor: '#3B82F6',
    width: 1056,
    height: 747,
    aspectRatioName: 'A4 Landscape',
    backgroundColor: '#FFFFFF',
    borderColor: '#2563EB',
    secondaryBorderColor: '#EC4899',
    borderWidth: 10,
    borderPadding: 16,
    borderStyle: 'solid',
    elements: [
      {
        id: 'el_title_2',
        type: 'text',
        x: 50,
        y: 20,
        content: 'CERTIFICATE OF ACHIEVEMENT',
        fontSize: 36,
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        color: '#1E3A8A',
        textAlign: 'center',
        letterSpacing: 2
      },
      {
        id: 'el_sub_2',
        type: 'text',
        x: 50,
        y: 33,
        content: 'THIS IS TO CERTIFY THAT',
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        letterSpacing: 2
      },
      {
        id: 'el_name_2',
        type: 'text',
        x: 50,
        y: 46,
        content: '{Name}',
        fontSize: 40,
        fontFamily: 'serif',
        fontWeight: 'bold',
        color: '#1E293B',
        textAlign: 'center'
      },
      {
        id: 'el_body_2',
        type: 'text',
        x: 50,
        y: 62,
        content: 'Has successfully fulfilled all requirements for {Project_Name} / {Course} with distinction.',
        fontSize: 18,
        color: '#475569',
        textAlign: 'center'
      },
      {
        id: 'el_date_2',
        type: 'text',
        x: 30,
        y: 83,
        content: 'Date: {Issue_Date}',
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center'
      },
      {
        id: 'el_sig_2',
        type: 'text',
        x: 70,
        y: 83,
        content: 'Authorized Signatory',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1E3A8A',
        textAlign: 'center'
      }
    ]
  }
];

const STORAGE_KEY = 'certflow_session_cache_v1';

// Reactive app state using Svelte 5 state with sessionStorage persistence
export class AppState {
  activeTab = $state<'data' | 'templates' | 'flow' | 'output'>('data');
  dataset = $state<Dataset>(SAMPLE_DATASETS[0]);
  templates = $state<CertificateTemplate[]>(DEFAULT_TEMPLATES);
  activeTemplateId = $state<string>(DEFAULT_TEMPLATES[0].id);
  assets = $state<AssetFile[]>([]);
  
  flowNodes = $state.raw<Node[]>([
    {
      id: 'node-data',
      type: 'dataSource',
      position: { x: 50, y: 150 },
      data: { label: 'Data Source', type: 'dataSource', recordCount: 6, columns: SAMPLE_DATASETS[0].columns }
    },
    {
      id: 'node-cond-1',
      type: 'condition',
      position: { x: 340, y: 150 },
      data: {
        label: 'Position == 1',
        type: 'condition',
        rule: { field: 'Position', operator: '==', value: '1' }
      }
    },
    {
      id: 'node-tpl-gold',
      type: 'templateNode',
      position: { x: 670, y: 70 },
      data: {
        label: 'Gold Template',
        type: 'templateNode',
        templateId: 'tpl_gold_excellence',
        templateName: 'Gold Excellence Award'
      }
    },
    {
      id: 'node-tpl-std',
      type: 'templateNode',
      position: { x: 670, y: 250 },
      data: {
        label: 'Standard Template',
        type: 'templateNode',
        templateId: 'tpl_standard_completion',
        templateName: 'Official Achievement Certificate'
      }
    }
  ]);

  flowEdges = $state.raw<Edge[]>([
    { id: 'e-data-cond', source: 'node-data', target: 'node-cond-1', animated: true },
    { id: 'e-cond-gold', source: 'node-cond-1', sourceHandle: 'true', target: 'node-tpl-gold', label: 'True', animated: true },
    { id: 'e-cond-std', source: 'node-cond-1', sourceHandle: 'false', target: 'node-tpl-std', label: 'False (Fallback)', animated: true }
  ]);

  generatedCertificates = $state<GeneratedCertificate[]>([]);

  constructor() {
    this.restoreFromSession();
  }

  // Restore state from sessionStorage (persists across page reloads, clears on tab close)
  private restoreFromSession() {
    if (typeof window === 'undefined') return;
    try {
      const cachedStr = sessionStorage.getItem(STORAGE_KEY);
      if (cachedStr) {
        const parsed = JSON.parse(cachedStr);
        if (parsed.dataset) this.dataset = parsed.dataset;
        if (parsed.templates && parsed.templates.length > 0) this.templates = parsed.templates;
        if (parsed.activeTemplateId) this.activeTemplateId = parsed.activeTemplateId;
        if (parsed.assets) this.assets = parsed.assets;
        if (parsed.flowNodes) this.flowNodes = parsed.flowNodes;
        if (parsed.flowEdges) this.flowEdges = parsed.flowEdges;
        if (parsed.generatedCertificates) this.generatedCertificates = parsed.generatedCertificates;
        if (parsed.activeTab) this.activeTab = parsed.activeTab;
      }
    } catch (err) {
      console.warn('Failed to restore session cache:', err);
    }
  }

  // Save current state to sessionStorage
  public saveToSession() {
    if (typeof window === 'undefined') return;
    try {
      const cacheObj = {
        dataset: this.dataset,
        templates: this.templates,
        activeTemplateId: this.activeTemplateId,
        assets: this.assets,
        flowNodes: this.flowNodes,
        flowEdges: this.flowEdges,
        generatedCertificates: this.generatedCertificates,
        activeTab: this.activeTab
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cacheObj));
    } catch (err) {
      console.warn('Failed to save session cache:', err);
    }
  }

  // Computed / Getter helpers
  get activeTemplate(): CertificateTemplate {
    return this.templates.find(t => t.id === this.activeTemplateId) || this.templates[0] || {
      id: 'tpl_blank',
      name: 'Blank Template',
      width: 1056,
      height: 747,
      backgroundColor: '#FFFFFF',
      borderStyle: 'none',
      elements: []
    };
  }

  setDataset(newDataset: Dataset) {
    this.dataset = newDataset;
    // Update dataSource node record count & columns
    const dataNodeIndex = this.flowNodes.findIndex(n => n.type === 'dataSource');
    if (dataNodeIndex !== -1) {
      this.flowNodes[dataNodeIndex].data = {
        ...this.flowNodes[dataNodeIndex].data,
        recordCount: newDataset.records.length,
        columns: newDataset.columns
      };
    }
    this.saveToSession();
  }

  addTemplate(template: CertificateTemplate) {
    this.templates = [...this.templates, template];
    this.activeTemplateId = template.id;
    this.saveToSession();
  }

  updateActiveTemplate(updated: CertificateTemplate) {
    this.templates = this.templates.map(t => t.id === updated.id ? updated : t);
    this.saveToSession();
  }

  deleteTemplate(templateId: string) {
    this.templates = this.templates.filter(t => t.id !== templateId);
    if (this.templates.length === 0) {
      const blankTpl: CertificateTemplate = {
        id: `tpl_${Date.now()}`,
        name: 'Blank Template',
        description: 'Fresh blank template',
        badgeColor: '#22D3EE',
        width: 1056,
        height: 747,
        aspectRatioName: 'A4 Landscape',
        backgroundColor: '#FFFFFF',
        borderColor: '#000000',
        borderStyle: 'solid',
        borderWidth: 8,
        borderPadding: 16,
        elements: []
      };
      this.templates = [blankTpl];
      this.activeTemplateId = blankTpl.id;
    } else if (this.activeTemplateId === templateId) {
      this.activeTemplateId = this.templates[0].id;
    }
    this.saveToSession();
  }

  addAsset(asset: AssetFile) {
    const existingIdx = this.assets.findIndex(a => a.name === asset.name);
    if (existingIdx !== -1) {
      this.assets[existingIdx] = asset;
    } else {
      this.assets = [...this.assets, asset];
    }
    this.saveToSession();
  }

  deleteAsset(assetId: string) {
    this.assets = this.assets.filter(a => a.id !== assetId);
    this.saveToSession();
  }

  clearAllDataAndReset() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    this.dataset = SAMPLE_DATASETS[0];
    this.templates = DEFAULT_TEMPLATES;
    this.activeTemplateId = DEFAULT_TEMPLATES[0].id;
    this.assets = [];
    this.generatedCertificates = [];
    this.activeTab = 'data';

    this.flowNodes = [
      {
        id: 'node-data',
        type: 'dataSource',
        position: { x: 50, y: 150 },
        data: { label: 'Data Source', type: 'dataSource', recordCount: 6, columns: SAMPLE_DATASETS[0].columns }
      },
      {
        id: 'node-cond-1',
        type: 'condition',
        position: { x: 340, y: 150 },
        data: {
          label: 'Position == 1',
          type: 'condition',
          rule: { field: 'Position', operator: '==', value: '1' }
        }
      },
      {
        id: 'node-tpl-gold',
        type: 'templateNode',
        position: { x: 670, y: 70 },
        data: {
          label: 'Gold Template',
          type: 'templateNode',
          templateId: 'tpl_gold_excellence',
          templateName: 'Gold Excellence Award'
        }
      },
      {
        id: 'node-tpl-std',
        type: 'templateNode',
        position: { x: 670, y: 250 },
        data: {
          label: 'Standard Template',
          type: 'templateNode',
          templateId: 'tpl_standard_completion',
          templateName: 'Official Achievement Certificate'
        }
      }
    ];

    this.flowEdges = [
      { id: 'e-data-cond', source: 'node-data', target: 'node-cond-1', animated: true },
      { id: 'e-cond-gold', source: 'node-cond-1', sourceHandle: 'true', target: 'node-tpl-gold', label: 'True', animated: true },
      { id: 'e-cond-std', source: 'node-cond-1', sourceHandle: 'false', target: 'node-tpl-std', label: 'False (Fallback)', animated: true }
    ];

    this.saveToSession();
  }
}

export const appState = new AppState();
