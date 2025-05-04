
import React, { useRef } from 'react';
import { importData } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

interface FileImportProps {
  onImportSuccess: () => void;
}

const FileImport: React.FC<FileImportProps> = ({ onImportSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
        const success = importData(event.target.result as string);
        if (success) {
          toast({
            title: "Import successful",
            description: "Your data has been imported."
          });
          onImportSuccess();
        } else {
          toast({
            title: "Import failed",
            description: "The file format is invalid.",
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
    <>
      <button className="terminal-button" onClick={handleClick}>
        Import JSON
      </button>
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />
    </>
  );
};

export default FileImport;
