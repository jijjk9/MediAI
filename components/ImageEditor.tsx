import React, { useState, useRef } from 'react';
import { editImage } from '../services/gemini';

const ImageEditor: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Strip prefix for API usage later, but keep for display
        setSelectedImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage || !prompt) return;
    setLoading(true);
    try {
      const match = selectedImage.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const resultBase64 = await editImage(base64Data, mimeType, prompt);
        setGeneratedImage(`data:image/png;base64,${resultBase64}`);
      }
    } catch (error) {
      alert("Image generation failed. Please check your API key and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100 h-full">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="material-icons">auto_fix_high</span> 图片智能编辑 (Nano Banana)
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        上传一张产品图片，并输入指令（例如：“添加复古滤镜”、“移除背景中的杂物”）。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
            <div 
                className="border-2 border-dashed border-slate-300 rounded-lg h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden relative"
                onClick={() => fileInputRef.current?.click()}
            >
                {selectedImage ? (
                    <img src={selectedImage} alt="Original" className="w-full h-full object-contain" />
                ) : (
                    <div className="text-center p-4">
                        <svg className="w-12 h-12 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-slate-500">点击上传图片</span>
                    </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="输入编辑指令..."
                    className="flex-1 border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-medical-500 outline-none"
                />
                <button 
                    onClick={handleGenerate}
                    disabled={loading || !selectedImage || !prompt}
                    className="bg-medical-600 hover:bg-medical-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                    {loading ? '生成中...' : '生成'}
                </button>
            </div>
        </div>

        <div className="border border-slate-200 rounded-lg h-64 md:h-auto flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {loading ? (
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-medical-600 mb-2"></div>
                    <span className="text-slate-400">AI 正在绘图...</span>
                </div>
            ) : generatedImage ? (
                <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
            ) : (
                <span className="text-slate-400">生成结果将显示在这里</span>
            )}
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;