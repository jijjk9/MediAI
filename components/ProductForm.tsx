import React from 'react';
import { ProductInfo } from '../types';

interface ProductFormProps {
  data: ProductInfo;
  onChange: (data: ProductInfo) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({ data, onChange, onConfirm, isLoading }) => {
  const handleChange = (key: keyof ProductInfo, value: string) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-medical-700">确认产品资料</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(data).map(([key, value]) => {
          if (key === 'sources') return null; // Handle sources separately
          
          return (
           <div key={key} className="flex flex-col">
             <label className="text-sm font-medium text-slate-600 mb-1 capitalize">
               {key === 'brandName' ? '品牌名' :
                key === 'productName' ? '产品名' :
                key === 'ingredients' ? '产品成分' :
                key === 'indications' ? '功能主治' :
                key === 'classification' ? '分类' :
                key === 'attribute' ? '属性' :
                key === 'drugCategory' ? '药品分类' :
                key === 'insuranceCategory' ? '医保类别' :
                key === 'origin' ? '产品来源' : key}
             </label>
             <input
                type="text"
                value={value as string}
                onChange={(e) => handleChange(key as keyof ProductInfo, e.target.value)}
                className="border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-medical-500 outline-none transition-all"
             />
           </div>
          );
        })}
      </div>

      {data.sources && data.sources.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200">
           <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
             参考来源 (Search Grounding)
           </h4>
           <div className="grid grid-cols-1 gap-2">
             {data.sources.map((source, idx) => (
               <a 
                 key={idx}
                 href={source.uri} 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="text-sm text-medical-600 hover:text-medical-800 hover:underline flex items-start gap-2 truncate"
                 title={source.title}
               >
                 <span className="bg-medical-100 text-medical-700 text-xs px-1.5 py-0.5 rounded shrink-0">{idx + 1}</span>
                 <span className="truncate">{source.title || source.uri}</span>
               </a>
             ))}
           </div>
        </div>
      )}

      <div className="flex justify-end mt-6">
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="bg-medical-600 hover:bg-medical-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? '处理中...' : '确认并继续'}
        </button>
      </div>
    </div>
  );
};

export default ProductForm;