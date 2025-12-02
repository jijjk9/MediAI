import React, { useEffect, useRef } from 'react';

interface MermaidProps {
  chart: string;
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.mermaid && containerRef.current && chart) {
      window.mermaid.initialize({ startOnLoad: false, theme: 'default' });
      // Clear previous SVG
      containerRef.current.innerHTML = '';
      
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      
      // Mermaid requires a wrapper to render into
      const tempElement = document.createElement('div');
      tempElement.id = id;
      document.body.appendChild(tempElement); // Append temporarily to body (sometimes needed for calc) but let's try render func

      try {
        window.mermaid.render(id, chart).then((result: any) => {
           if (containerRef.current) {
             containerRef.current.innerHTML = result.svg;
           }
           tempElement.remove();
        });
      } catch (e) {
        console.error("Mermaid render error", e);
        if (containerRef.current) {
            containerRef.current.innerHTML = '<div class="text-red-500 p-4">Error rendering diagram</div>';
        }
        if (tempElement) tempElement.remove();
      }
    }
  }, [chart]);

  return (
    <div className="w-full overflow-x-auto p-4 bg-white rounded-lg shadow-sm border border-slate-200" ref={containerRef}>
      {/* SVG will be injected here */}
      <div className="text-center text-gray-400 text-sm">Loading Diagram...</div>
    </div>
  );
};

export default Mermaid;