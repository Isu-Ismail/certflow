export interface StudentRecord {
  id: string;
  [key: string]: any;
}

export interface Dataset {
  name: string;
  fileName?: string;
  columns: string[];
  records: StudentRecord[];
}

export interface AssetFile {
  id: string;
  name: string; // e.g. "logo.png"
  path: string; // e.g. "./logo.png"
  dataUrl: string;
  size?: number;
  type?: string;
}

export type ElementType = 'text' | 'image' | 'shape' | 'line' | 'badge' | 'qr';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number; // in percentage (0-100) or pixels
  y: number; // in percentage (0-100) or pixels
  width?: number;
  height?: number;
  content: string; // Text content (can contain {column_name}) or Image URL
  src?: string; // Optional image source URL / Base64
  align?: 'left' | 'center' | 'right'; // Optional alignment alias
  fieldKey?: string; // Optional field key alias
  fontSize?: number; // in px or pt
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  letterSpacing?: number;
  opacity?: number;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  zIndex?: number;
  rotation?: number;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  description?: string;
  badgeColor?: string;
  width: number; // canvas width in px, default e.g. 1056 (A4 300dpi ratio)
  height: number; // canvas height in px, default e.g. 747
  aspectRatioName?: 'A4 Landscape' | 'A4 Portrait' | 'Letter Landscape' | 'Square' | 'Custom';
  backgroundColor: string;
  backgroundGradient?: string;
  backgroundImage?: string;
  borderColor?: string;
  secondaryBorderColor?: string;
  borderWidth?: number;
  borderPadding?: number;
  borderStyle?: 'gold-classic' | 'double' | 'solid' | 'triple-gold' | 'canvas-frame' | 'none';
  customHtml?: string; // Optional custom uploaded HTML template code
  elements: CanvasElement[];
}

export type OperatorType = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith';

export interface ConditionRule {
  field: string;
  operator: OperatorType;
  value: string;
}

export type CustomNodeType = 'dataSource' | 'condition' | 'templateNode';

export interface FlowNodeData {
  label: string;
  type: CustomNodeType;
  // For dataSource
  recordCount?: number;
  columns?: string[];
  // For condition
  rule?: ConditionRule;
  // For templateNode
  templateId?: string;
  templateName?: string;
  matchedCount?: number;
}

export interface GeneratedCertificate {
  id: string;
  student: StudentRecord;
  template: CertificateTemplate;
  generatedAt: string;
}
