export enum ProductType {
  TCM = '中成药', // Traditional Chinese Medicine
  Chemical = '化学药',
  Biological = '生物药',
  Combined = '中西结合',
  Unknown = '未知'
}

export enum ProductAttribute {
  RX = '处方药',
  OTC_A = 'OTC甲类',
  OTC_B = 'OTC乙类',
  Dual = '处方药/OTC双跨',
  Supplement = '保健品',
  Unknown = '未知'
}

export interface ProductSource {
  title: string;
  uri: string;
}

export interface ProductInfo {
  brandName: string;
  productName: string;
  ingredients: string;
  indications: string;
  classification: ProductType | string;
  attribute: ProductAttribute | string;
  drugCategory: string; // From NRDL
  insuranceCategory: string; // From NRDL
  origin: string; // Source/Manufacturer info
  sources?: ProductSource[];
}

export interface IngredientAnalysis {
  tcmTable?: string; // Markdown
  tcmRelations?: string; // Jun-Chen-Zuo-Shi
  tcmSynergy?: string;
  westernTable?: string; // Markdown
  combinedSynergy?: string;
}

export interface DiagramAnalysis {
  explanation: string; // Detailed text explanation
  mermaidCode: string; // The diagram code
}

export interface MedicalAnalysis {
  id: string;
  timestamp: number;
  product: ProductInfo;
  ingredientAnalysis: IngredientAnalysis;
  pathology: DiagramAnalysis;
  pharmacology: DiagramAnalysis;
  chatHistory: ChatMessage[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

// Augment window for mermaid
declare global {
  interface Window {
    mermaid: any;
  }
}