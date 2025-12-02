import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { ProductInfo, IngredientAnalysis, DiagramAnalysis } from "../types";

// NOTE: In a real production app, this key should be proxied or handled securely.
// For this demo, we assume process.env.API_KEY is available.
const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- Flow 2: Product Info Search ---
export const searchProductInfo = async (brand: string, name: string): Promise<ProductInfo> => {
  const prompt = `
    请全网搜索产品说明书、国家医保目录(NRDL)及药监局数据：品牌“[${brand}]”，产品名“[${name}]”。
    
    任务：
    1. 查找产品说明书，获取准确的【成分】和【功能主治】。
    2. 判断分类（中成药/化学药/生物药/中西结合）。
    3. 判断属性（处方药/OTC甲类/OTC乙类/双跨/保健品）。
    4. 查找[药品分类]：请务必提供详细的药理分类或治疗领域（例如：“内科用药 > 祛暑剂 > 解表祛暑剂”）。
    5. **严格核查[医保报销类别]**：
       - 请专门搜索 "${name} 国家医保目录 2024" 或 "National Reimbursement Drug List".
       - 如果该具体品牌产品明确在目录中，输出“甲类”或“乙类”。
       - **关键**：如果搜索不到明确的医保等级，或者该药属于自费药、保健品，或者资料模棱两可，必须输出“无”。**严禁**随意猜测或根据同类药推断。
    6. 查找产品来源（组方来源或原研企业）。

    请严格返回以下 JSON 格式（不要使用 Markdown 代码块，仅返回纯 JSON 字符串）：
    {
      "brandName": "${brand}",
      "productName": "${name}",
      "ingredients": "...",
      "indications": "...",
      "classification": "...",
      "attribute": "...",
      "drugCategory": "...", 
      "insuranceCategory": "...", // 必须是 '甲类'、'乙类' 或 '无'
      "origin": "..."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "{}";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const productInfo = JSON.parse(cleanText) as ProductInfo;

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map((chunk: any) => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
      .filter((s: any) => s !== null);
    
    return { ...productInfo, sources };
  } catch (e) {
    console.error("Search failed", e);
    throw new Error("Failed to retrieve product information. Please try again.");
  }
};

// --- Flow 3: Ingredient Analysis ---
export const analyzeIngredients = async (product: ProductInfo): Promise<IngredientAnalysis> => {
  const prompt = `
    基于以下产品信息进行成分深度解读：
    名称：${product.productName}
    成分：${product.ingredients}
    分类：${product.classification}

    任务：
    1. **西医解读模块（所有药品必须包含）**：
       - 针对化学药：分析化学成分、分子机制。
       - **针对中成药/中西结合**：必须分析主要中药材中所含的**现代药理活性成分**（如：小檗碱、黄酮类等）及其对应的**分子靶点**和药理作用。
       - 输出Markdown表格：|名称/药材|核心化学成分|药理靶点|功效作用|临床应用|
    
    2. **中医解读模块（仅限中成药/中西结合）**：
       - 输出Markdown表格：|名称|类别|性味|归经|功效|临床应用|
       - 分析君臣佐使。
       - 分析组方功效和适应症。

    3. 中西结合/复方制剂：额外分析成分间的协同功效。

    请返回 JSON 格式：
    {
      "tcmTable": "Markdown表格...",
      "tcmRelations": "君臣佐使描述...",
      "tcmSynergy": "组方功效描述...",
      "westernTable": "Markdown表格 (包含中药材的现代药理分析)...",
      "combinedSynergy": "协同功效描述..."
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
        responseMimeType: "application/json"
    }
  });

  const cleanText = (response.text || "{}").replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanText);
};

// --- Flow 4: Pathology Analysis (Text + Mermaid) ---
export const generatePathologyAnalysis = async (product: ProductInfo): Promise<DiagramAnalysis> => {
  // NOTE: We intentionally EXCLUDE productName and ingredients to focus PURELY on indications/pathology.
  const prompt = `
    你是一位资深病理学家。请**仅根据**以下【功能主治】描述，进行纯粹的病理学分析。
    
    **严禁**在分析中提及任何具体的药物名称、品牌或成分。只分析病症本身。
    
    功能主治：${product.indications}

    **核心任务：**
    1.  **拆解病机**：分析功能主治中提及的疾病或症状的发生发展过程。
    2.  **逻辑关联**：
        -   区分“本”（病因/Root Cause）与“标”（症状/Symptoms）。
        -   建立从环境/内因 -> 病机变化 -> 组织器官损伤 -> 临床表现的完整链条。
    3.  **文字解读**：
        -   使用 Markdown 格式。
        -   **加粗**关键的病理节点和医学术语。
        -   分条目清晰阐述病理机制。
    4.  **流程图绘制 (Mermaid)**：
        -   绘制 \`graph TD\`。
        -   节点仅包含生理/病理名称（如“外感风寒”、“肺气失宣”），**不要**包含“治疗”、“药物”等字眼。
        -   如果涉及多系统（如呼吸系统+消化系统），使用 \`subgraph\` 区分。

    请返回 JSON 格式：
    {
      "explanation": "Markdown 格式的详细病理解读...",
      "mermaidCode": "Mermaid 代码字符串 (graph TD...)"
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
        responseMimeType: "application/json"
    }
  });

  const cleanText = (response.text || "{}").replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanText);
};

// --- Flow 5: Pharmacology Analysis (Text + Mermaid) ---
export const generatePharmacologyAnalysis = async (
  pathologyAnalysis: DiagramAnalysis,
  ingredientAnalysis: IngredientAnalysis,
  product: ProductInfo
): Promise<DiagramAnalysis> => {
  const context = JSON.stringify(ingredientAnalysis).slice(0, 10000); 
  const prompt = `
    你是一位资深药理学家。现在请将【产品成分】映射到刚才建立的【病理模型】上。

    产品名称：${product.productName}
    原始病理图代码：
    ${pathologyAnalysis.mermaidCode}

    成分分析数据：
    ${context}

    **核心任务：**
    1.  **药理映射**：
        -   识别病理图中的关键节点（Targets）。
        -   指出产品中的具体成分（或中药组方）是如何干预这些节点的。
    2.  **文字解读**：
        -   使用 Markdown 格式。
        -   **重点解读**：产品成分与病理环节的对应关系。
        -   例如：“**麻黄** 通过 **宣肺平喘** 作用于 **肺气闭郁** 环节”。
    3.  **流程图重绘 (Mermaid)**：
        -   保留原有的病理节点（白色/默认色）。
        -   **插入药理节点**：使用不同的形状（如六边形 \`{{}}\`）和颜色（\`style fill:#f9f,stroke:#333\`）表示药物/成分。
        -   连线表示作用机制（如 \`--抑制-->\`，\`--促进-->\`）。

    请返回 JSON 格式：
    {
      "explanation": "Markdown 格式的详细药理机制解读...",
      "mermaidCode": "Mermaid 代码字符串..."
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
        responseMimeType: "application/json"
    }
  });

  const cleanText = (response.text || "{}").replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanText);
};

// --- Flow 6: Image Editing ---
export const editImage = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }
    throw new Error("No image data found in response");
  } catch (e) {
    console.error("Image editing failed", e);
    throw e;
  }
};

// --- Flow 7: Chat ---
export const createChatSession = (systemInstruction: string) => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction,
    }
  });
};