
import React, { useRef, useState } from 'react';
import { importData, importDataCSV } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

interface FileImportProps {
  onImportSuccess: () => void;
}

const FileImport: React.FC<FileImportProps> = ({ onImportSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        let success = false;
        
        if (importFormat === 'json') {
          success = importData(event.target.result as string);
        } else {
          success = importDataCSV(event.target.result as string);
        }
        
        if (success) {
          toast({
            title: "Import successful",
            description: `Your data has been imported from ${importFormat.toUpperCase()}.`
          });
          onImportSuccess();
        } else {
          toast({
            title: "Import failed",
            description: `The ${importFormat.toUpperCase()} file format is invalid.`,
            variant: "destructive"
          });
        }
      }
    };
    reader.readAsText(file);
    
    // Reset the input so the same file can be imported again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="flex border border-terminal-accent">
        <button 
          className={`px-2 py-1 ${importFormat === 'json' ? 'bg-terminal-accent text-terminal-bg' : ''}`}
          onClick={() => setImportFormat('json')}
        >
          JSON
        </button>
        <button 
          className={`px-2 py-1 ${importFormat === 'csv' ? 'bg-terminal-accent text-terminal-bg' : ''}`}
          onClick={() => setImportFormat('csv')}
        >
          CSV
        </button>
      </div>
      <button className="terminal-button" onClick={handleClick}>
        Import {importFormat.toUpperCase()}
      </button>
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={importFormat === 'json' ? '.json' : '.csv'}
        className="hidden"
      />
    </div>
  );
};

export default FileImport;
