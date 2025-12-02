import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ProductInfo, IngredientAnalysis, ChatMessage, MedicalAnalysis, DiagramAnalysis } from './types';
import * as GeminiService from './services/gemini';
import ProductForm from './components/ProductForm';
import Mermaid from './components/Mermaid';
import ImageEditor from './components/ImageEditor';
import { Chat } from '@google/genai';

const App: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<'analysis' | 'history' | 'image'>('analysis');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  
  // Inputs
  const [brandInput, setBrandInput] = useState('');
  const [productInput, setProductInput] = useState('');

  // Data
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [ingredientAnalysis, setIngredientAnalysis] = useState<IngredientAnalysis | null>(null);
  const [pathologyAnalysis, setPathologyAnalysis] = useState<DiagramAnalysis | null>(null);
  const [pharmacologyAnalysis, setPharmacologyAnalysis] = useState<DiagramAnalysis | null>(null);
  
  // Chat
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatSessionRef = useRef<Chat | null>(null);

  // History
  const [historyList, setHistoryList] = useState<MedicalAnalysis[]>([]);

  useEffect(() => {
    // Load history
    const stored = localStorage.getItem('medi_analyst_history');
    if (stored) {
      try {
        setHistoryList(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const saveToHistory = () => {
    if (!productInfo || !ingredientAnalysis || !pathologyAnalysis || !pharmacologyAnalysis) return;
    
    const newEntry: MedicalAnalysis = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      product: productInfo,
      ingredientAnalysis,
      pathology: pathologyAnalysis,
      pharmacology: pharmacologyAnalysis,
      chatHistory: chatHistory
    };

    const updated = [newEntry, ...historyList].slice(0, 20); // Keep last 20
    setHistoryList(updated);
    localStorage.setItem('medi_analyst_history', JSON.stringify(updated));
    alert('报告已保存至历史记录');
  };

  const loadFromHistory = (item: MedicalAnalysis) => {
    setProductInfo(item.product);
    setIngredientAnalysis(item.ingredientAnalysis);
    setPathologyAnalysis(item.pathology);
    setPharmacologyAnalysis(item.pharmacology);
    setChatHistory(item.chatHistory);
    
    setBrandInput(item.product.brandName);
    setProductInput(item.product.productName);
    
    // Initialize chat session with context
    initChat(item.product, item.ingredientAnalysis, item.pathology.mermaidCode, item.pharmacology.mermaidCode);
    
    setStep(7);
    setActiveTab('analysis');
  };

  const initChat = (p: ProductInfo, i: IngredientAnalysis, path: string, pharm: string) => {
    const context = `
      产品: ${p.brandName} ${p.productName}
      成分分析: ${JSON.stringify(i)}
      病理图: ${path}
      药理图: ${pharm}
    `;
    chatSessionRef.current = GeminiService.createChatSession(
      `你是一个医药健康专家。基于以下产品分析报告回答用户问题：\n${context}`
    );
  };

  // --- Report Generation & Download (HTML Format) ---
  const generateReportHTML = (
    p: ProductInfo, 
    i: IngredientAnalysis, 
    path: DiagramAnalysis, 
    pharm: DiagramAnalysis
  ) => {
    // Helper to combine ingredient markdown for rendering
    let ingredientMd = '';
    if (i.tcmTable) ingredientMd += `### 中医解读\n${i.tcmTable}\n\n`;
    if (i.tcmRelations) ingredientMd += `**君臣佐使**: ${i.tcmRelations}\n\n`;
    if (i.tcmSynergy) ingredientMd += `**组方功效**: ${i.tcmSynergy}\n\n`;
    if (i.westernTable) ingredientMd += `### 西医/现代药理\n${i.westernTable}\n\n`;
    if (i.combinedSynergy) ingredientMd += `### 中西协同\n${i.combinedSynergy}\n\n`;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.brandName} ${p.productName} - 深度解读报告</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; }
  .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
  h1 { border-bottom: 2px solid #0ea5e9; padding-bottom: 16px; color: #0f172a; margin-bottom: 24px; text-align: center; }
  h2 { color: #0369a1; margin-top: 40px; border-left: 5px solid #0ea5e9; padding-left: 12px; font-size: 1.5rem; }
  h3 { color: #0284c7; margin-top: 24px; font-size: 1.25rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
  p { margin-bottom: 16px; text-align: justify; }
  table { border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 0.95rem; }
  th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; vertical-align: top; }
  th { background-color: #f1f5f9; font-weight: 600; color: #475569; }
  tr:nth-child(even) { background-color: #f8fafc; }
  .mermaid { text-align: center; margin: 30px 0; padding: 20px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow-x: auto; }
  .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; background: #f0f9ff; padding: 20px; border-radius: 8px; border: 1px solid #bae6fd; margin-bottom: 24px; }
  .info-item { font-size: 0.95rem; }
  .info-item strong { color: #0284c7; display: inline-block; margin-right: 8px; }
  .timestamp { color: #64748b; font-size: 0.875rem; margin-bottom: 40px; text-align: center; }
  .hidden-md { display: none; }
  blockquote { border-left: 4px solid #bae6fd; margin: 16px 0; padding: 8px 16px; background-color: #f0f9ff; color: #334155; }
  ul, ol { padding-left: 24px; margin-bottom: 16px; }
  li { margin-bottom: 8px; }
  strong { color: #0f172a; font-weight: 600; }
  @media print {
    body { background: white; padding: 0; }
    .container { box-shadow: none; padding: 0; }
  }
</style>
</head>
<body>
<div class="container">
  <h1>${p.brandName} ${p.productName} - 深度解读报告</h1>
  <p class="timestamp">生成时间: ${new Date().toLocaleString()} | 生成工具: MediAnalyst AI</p>
  
  <h2>1. 产品基本信息</h2>
  <div class="info-grid">
    <div class="info-item"><strong>品牌:</strong> ${p.brandName}</div>
    <div class="info-item"><strong>名称:</strong> ${p.productName}</div>
    <div class="info-item"><strong>分类:</strong> ${p.classification}</div>
    <div class="info-item"><strong>属性:</strong> ${p.attribute}</div>
    <div class="info-item"><strong>药品分类:</strong> ${p.drugCategory}</div>
    <div class="info-item"><strong>医保类别:</strong> ${p.insuranceCategory}</div>
    <div class="info-item"><strong>来源:</strong> ${p.origin}</div>
  </div>
  <p><strong>功能主治:</strong> ${p.indications}</p>
  <p><strong>成分:</strong> ${p.ingredients}</p>

  <h2>2. 成分深度解读</h2>
  <div id="render-ingredients"></div>
  <textarea id="md-ingredients" class="hidden-md">${ingredientMd}</textarea>

  <h2>3. 病理过程解读</h2>
  <div id="render-pathology"></div>
  <textarea id="md-pathology" class="hidden-md">${path.explanation}</textarea>
  
  <h3>病理流程图</h3>
  <div class="mermaid">
${path.mermaidCode}
  </div>

  <h2>4. 药理作用机制</h2>
  <div id="render-pharmacology"></div>
  <textarea id="md-pharmacology" class="hidden-md">${pharm.explanation}</textarea>

  <h3>药理流程图</h3>
  <div class="mermaid">
${pharm.mermaidCode}
  </div>
</div>

<script>
  // Initialize Mermaid
  mermaid.initialize({ startOnLoad: true, theme: 'default' });

  // Render Markdown
  function renderMd(idSrc, idDest) {
    const raw = document.getElementById(idSrc).value;
    document.getElementById(idDest).innerHTML = marked.parse(raw);
  }

  // Execute rendering
  window.onload = function() {
    renderMd('md-ingredients', 'render-ingredients');
    renderMd('md-pathology', 'render-pathology');
    renderMd('md-pharmacology', 'render-pharmacology');
  };
</script>
</body>
</html>`;
  };

  const handleDownload = (
    p: ProductInfo | null, 
    i: IngredientAnalysis | null, 
    path: DiagramAnalysis | null, 
    pharm: DiagramAnalysis | null
  ) => {
    if (!p || !i || !path || !pharm) return;
    
    const content = generateReportHTML(p, i, path, pharm);
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${p.brandName}_${p.productName}_解读报告.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- Actions ---

  const handleStart = async () => {
    if (!brandInput || !productInput) return;
    setStep(2);
    setLoading(true);
    setLoadingMsg('正在全网搜索产品说明书及相关资料...');
    try {
      const info = await GeminiService.searchProductInfo(brandInput, productInput);
      setProductInfo(info);
    } catch (e) {
      alert("搜索失败，请重试");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmProduct = async () => {
    if (!productInfo) return;
    setStep(3);
    setLoading(true);
    setLoadingMsg('正在深度解读产品成分 (Gemini 3.0 Pro)...');
    
    try {
      // Step 3: Ingredients
      const analysis = await GeminiService.analyzeIngredients(productInfo);
      setIngredientAnalysis(analysis);

      // Step 4: Pathology
      setLoadingMsg('正在进行纯病理机制分析（不含药物干预）...');
      // Updated: Pass full product info, but service will ignore product name logic for pathology
      const pathologyRes = await GeminiService.generatePathologyAnalysis(productInfo);
      setPathologyAnalysis(pathologyRes);

      // Step 5: Pharmacology
      setLoadingMsg('正在构建“病理-药理”综合作用图谱...');
      // Updated: Combine pathology with product ingredients
      const pharmacologyRes = await GeminiService.generatePharmacologyAnalysis(pathologyRes, analysis, productInfo);
      setPharmacologyAnalysis(pharmacologyRes);

      setStep(6); // Go to confirmation/review
    } catch (e) {
      console.error(e);
      alert("分析过程中断，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalConfirm = () => {
    setStep(7);
    if (productInfo && ingredientAnalysis && pathologyAnalysis && pharmacologyAnalysis) {
        initChat(productInfo, ingredientAnalysis, pathologyAnalysis.mermaidCode, pharmacologyAnalysis.mermaidCode);
        setChatHistory([{ role: 'model', content: `我已经完成了对 **${productInfo?.productName}** 的全维解读，您可以问我任何相关问题。` }]);
        saveToHistory();
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatSessionRef.current) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    
    try {
      const result = await chatSessionRef.current.sendMessage({ message: userMsg });
      setChatHistory(prev => [...prev, { role: 'model', content: result.text || "Sorry, I couldn't understand that." }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'model', content: "Error communicating with AI." }]);
    }
  };

  // --- Renders ---

  const renderStep1 = () => (
    <div className="flex flex-col items-center justify-center h-full py-20 animate-fade-in">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <div className="bg-medical-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-medical-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">产品深度解读</h2>
          <p className="text-slate-500 mt-2">基于 Gemini 2.5 Flash 的联网搜索与智能分析</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">品牌名称</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500 outline-none"
              placeholder="例如：同仁堂"
              value={brandInput}
              onChange={(e) => setBrandInput(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">产品名称</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500 outline-none"
              placeholder="例如：六味地黄丸"
              value={productInput}
              onChange={(e) => setProductInput(e.target.value)}
            />
          </div>
          <button 
            onClick={handleStart}
            disabled={!brandInput || !productInput}
            className="w-full bg-medical-600 hover:bg-medical-700 text-white font-semibold py-3 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-medical-500/30"
          >
            开始分析
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-md my-8 animate-fade-in">
      {productInfo ? (
        <ProductForm 
          data={productInfo} 
          onChange={setProductInfo} 
          onConfirm={handleConfirmProduct}
          isLoading={loading}
        />
      ) : null}
    </div>
  );

  const renderAnalysisReport = () => (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-fade-in">
      {/* 3. Ingredient Analysis */}
      {ingredientAnalysis && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-2xl font-bold text-medical-700 mb-6 border-b pb-4 flex items-center gap-2">
            <span className="material-icons">science</span> 成分深度解读
          </h3>
          
          {ingredientAnalysis.tcmTable && (
            <div className="mb-8">
              <h4 className="font-bold text-lg mb-3 text-slate-800 bg-slate-50 p-2 rounded-md border-l-4 border-medical-500">中医解读</h4>
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{ingredientAnalysis.tcmTable}</ReactMarkdown>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-amber-50 p-5 rounded-lg border border-amber-100">
                  <span className="font-bold text-amber-800 text-lg block mb-2">君臣佐使</span>
                  <div className="markdown-body text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{ingredientAnalysis.tcmRelations}</ReactMarkdown>
                  </div>
                </div>
                <div className="bg-emerald-50 p-5 rounded-lg border border-emerald-100">
                  <span className="font-bold text-emerald-800 text-lg block mb-2">组方功效</span>
                  <div className="markdown-body text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{ingredientAnalysis.tcmSynergy}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          )}

          {ingredientAnalysis.westernTable && (
            <div className="mb-8">
               <h4 className="font-bold text-lg mb-3 text-slate-800 bg-slate-50 p-2 rounded-md border-l-4 border-blue-500">西医/现代药理学解读</h4>
               <div className="markdown-body">
                 <ReactMarkdown remarkPlugins={[remarkGfm]}>{ingredientAnalysis.westernTable}</ReactMarkdown>
               </div>
            </div>
          )}

          {ingredientAnalysis.combinedSynergy && (
             <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 mt-6">
                <span className="font-bold text-indigo-800 text-lg block mb-2">中西协同</span>
                <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{ingredientAnalysis.combinedSynergy}</ReactMarkdown>
                </div>
              </div>
          )}
        </div>
      )}

      {/* 4. Pathology */}
      {pathologyAnalysis && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-2xl font-bold text-medical-700 mb-6 border-b pb-4 flex items-center gap-2">
             <span className="material-icons">healing</span> 病理过程深度解读
          </h3>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="prose prose-slate max-w-none">
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-100 markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{pathologyAnalysis.explanation}</ReactMarkdown>
                </div>
            </div>
            <div className="min-h-[300px]">
               <h4 className="font-semibold text-slate-500 mb-2 text-sm uppercase tracking-wider">病理流程图</h4>
               <Mermaid chart={pathologyAnalysis.mermaidCode} />
            </div>
          </div>
        </div>
      )}

      {/* 5. Pharmacology */}
      {pharmacologyAnalysis && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-2xl font-bold text-medical-700 mb-6 border-b pb-4 flex items-center gap-2">
            <span className="material-icons">medication</span> 药理作用机制
          </h3>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
             <div className="prose prose-slate max-w-none">
                <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 markdown-body">
                   <ReactMarkdown remarkPlugins={[remarkGfm]}>{pharmacologyAnalysis.explanation}</ReactMarkdown>
                </div>
             </div>
             <div className="min-h-[300px]">
                <h4 className="font-semibold text-slate-500 mb-2 text-sm uppercase tracking-wider">药理作用图谱</h4>
                <Mermaid chart={pharmacologyAnalysis.mermaidCode} />
             </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      {step === 6 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-center z-10 shadow-lg">
           <button 
             onClick={handleFinalConfirm}
             className="bg-medical-600 hover:bg-medical-700 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-medical-500/30 transition-all hover:-translate-y-1"
           >
             确认无误，进入 AI 问答
           </button>
        </div>
      )}
    </div>
  );

  const renderChat = () => (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden my-4">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl markdown-body ${
              msg.role === 'user' 
                ? 'bg-slate-200 text-slate-800 rounded-br-none' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
            }`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 border border-slate-300 rounded-full px-4 py-2 focus:ring-2 focus:ring-medical-500 outline-none"
            placeholder="针对该产品提问..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button 
            onClick={handleSendMessage}
            className="bg-medical-600 text-white p-2 rounded-full hover:bg-medical-700 transition-colors w-10 h-10 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">历史记录</h2>
        {historyList.length === 0 ? (
            <div className="text-center text-slate-500 py-12 bg-white rounded-lg shadow-sm">
                <p>暂无历史记录</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {historyList.map((item) => (
                    <div key={item.id} className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 hover:border-medical-300 transition-colors flex justify-between items-center group">
                        <div>
                            <h3 className="text-lg font-bold text-medical-700 group-hover:text-medical-600">{item.product.brandName} {item.product.productName}</h3>
                            <p className="text-sm text-slate-500 mt-1">{new Date(item.timestamp).toLocaleString()} • {item.product.classification}</p>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleDownload(item.product, item.ingredientAnalysis, item.pathology, item.pharmacology)}
                                className="px-4 py-2 text-sm bg-slate-100 hover:bg-medical-100 text-slate-700 hover:text-medical-700 rounded-md font-medium transition-colors flex items-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                下载报告 (HTML)
                            </button>
                            <button 
                                onClick={() => loadFromHistory(item)}
                                className="px-4 py-2 text-sm bg-medical-50 hover:bg-medical-100 text-medical-700 rounded-md font-medium transition-colors"
                            >
                                查看详情
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('analysis'); setStep(1); }}>
            <span className="bg-gradient-to-r from-medical-500 to-cyan-500 text-white p-1.5 rounded-lg">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">MediAnalyst <span className="text-medical-500">AI</span></h1>
          </div>
          
          <div className="flex space-x-2">
             <button 
               onClick={() => { setActiveTab('analysis'); if(step===7) setStep(1); }}
               className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'analysis' ? 'bg-medical-50 text-medical-700' : 'text-slate-500 hover:text-slate-900'}`}
             >
               产品解读
             </button>
             <button 
               onClick={() => setActiveTab('image')}
               className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'image' ? 'bg-medical-50 text-medical-700' : 'text-slate-500 hover:text-slate-900'}`}
             >
               图片创作
             </button>
             <button 
               onClick={() => setActiveTab('history')}
               className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-medical-50 text-medical-700' : 'text-slate-500 hover:text-slate-900'}`}
             >
               历史记录
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {loading && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-medical-500 mb-4"></div>
             <p className="text-lg text-slate-700 font-medium animate-pulse">{loadingMsg}</p>
          </div>
        )}

        {activeTab === 'history' && renderHistory()}
        
        {activeTab === 'image' && (
           <div className="max-w-4xl mx-auto py-8 animate-fade-in">
             <ImageEditor />
           </div>
        )}

        {activeTab === 'analysis' && (
          <>
            {/* Progress Bar (Only for Analysis) */}
            <div className="mb-8">
              <div className="flex justify-between text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                <span className={step >= 1 ? 'text-medical-600' : ''}>启动</span>
                <span className={step >= 2 ? 'text-medical-600' : ''}>资料确认</span>
                <span className={step >= 3 ? 'text-medical-600' : ''}>深度解读</span>
                <span className={step >= 7 ? 'text-medical-600' : ''}>AI 问答</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-medical-500 transition-all duration-500 ease-out" 
                  style={{ width: `${(step / 7) * 100}%` }}
                ></div>
              </div>
            </div>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {(step === 3 || step === 4 || step === 5 || step === 6) && renderAnalysisReport()}
            {step === 7 && (
                <>
                 <div className="mb-8 flex justify-between items-center">
                     <button 
                        onClick={() => setStep(6)}
                        className="text-sm text-medical-600 hover:underline flex items-center gap-1"
                     >
                        ← 查看报告详情
                     </button>
                     <div className="flex gap-2">
                         <button
                            onClick={() => handleDownload(productInfo, ingredientAnalysis, pathologyAnalysis, pharmacologyAnalysis)}
                            className="text-sm bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-sm"
                         >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            下载报告 (HTML)
                         </button>
                         <button
                            onClick={saveToHistory}
                            className="text-sm bg-medical-50 text-medical-700 border border-medical-200 px-3 py-1.5 rounded hover:bg-medical-100 transition-colors shadow-sm"
                         >
                            保存记录
                         </button>
                     </div>
                 </div>
                 {renderChat()}
                </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;