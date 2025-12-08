"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, Clock, X } from "lucide-react";

interface ProcessingProgress {
  stage: 'parsing' | 'recovery' | 'processing' | 'storing' | 'complete' | 'error';
  progress: number;
  message: string;
  details?: {
    totalRows?: number;
    processedRows?: number;
    recoveredRows?: number;
    extractedMessages?: number;
    errors?: string[];
    warnings?: string[];
  };
}

interface UploadResult {
  success: boolean;
  processingId: string;
  conversation?: {
    id: string;
    title: string;
    messageCount: number;
  };
  processing?: {
    summary: any;
    corruption: any;
    cleaning: any;
  };
  error?: string;
}

interface RobustFileUploaderProps {
  clientId: string;
  clientName: string;
  onUploadComplete: (result: UploadResult) => void;
  onProgress?: (progress: ProcessingProgress) => void;
  maxFileSize?: number; // in bytes
  acceptedFormats?: string[];
}

export default function RobustFileUploader({
  clientId,
  clientName,
  onUploadComplete,
  onProgress,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  acceptedFormats = ['.xlsx', '.xls', '.csv']
}: RobustFileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentProgress, setCurrentProgress] = useState<ProcessingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    setError(null);
    setUploadResult(null);
    
    // Validate file size
    if (file.size > maxFileSize) {
      setError(`File size (${formatFileSize(file.size)}) exceeds limit (${formatFileSize(maxFileSize)})`);
      return;
    }

    // Validate file type
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(fileExt)) {
      setError(`File type not supported. Please upload one of: ${acceptedFormats.join(', ')}`);
      return;
    }

    setSelectedFile(file);
  }, [maxFileSize, acceptedFormats]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setCurrentProgress({
      stage: 'parsing',
      progress: 0,
      message: 'Starting file upload...'
    });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('clientId', clientId);
      formData.append('options', JSON.stringify({
        processingMode: 'thorough',
        skipDataRecovery: false,
        skipTextCleaning: false
      }));

      const response = await fetch('/api/conversations/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result: UploadResult = await response.json();
      
      if (result.success && result.processingId) {
        // Start polling for progress updates
        startProgressPolling(result.processingId);
        
        setUploadResult(result);
        onUploadComplete(result);
      } else {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
      setError(errorMessage);
      setCurrentProgress({
        stage: 'error',
        progress: -1,
        message: errorMessage
      });
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, clientId, onUploadComplete]);

  const startProgressPolling = useCallback((processingId: string) => {
    progressInterval.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/conversations/progress/${processingId}`);
        if (response.ok) {
          const progress: ProcessingProgress = await response.json();
          setCurrentProgress(progress);
          onProgress?.(progress);

          // Stop polling when complete or error
          if (progress.stage === 'complete' || progress.stage === 'error') {
            if (progressInterval.current) {
              clearInterval(progressInterval.current);
              progressInterval.current = null;
            }
          }
        }
      } catch (error) {
        console.error('Progress polling error:', error);
      }
    }, 1000); // Poll every second
  }, [onProgress]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    setCurrentProgress(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProgressColor = (stage: ProcessingProgress['stage']): string => {
    switch (stage) {
      case 'complete': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'processing': return 'bg-tactical-gold-muted0';
      case 'recovery': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStageIcon = (stage: ProcessingProgress['stage']) => {
    switch (stage) {
      case 'complete': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'processing': 
      case 'recovery': 
      case 'parsing': 
      case 'storing': return <Clock className="w-5 h-5 text-tactical-gold animate-spin" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-tactical-gold-400 bg-tactical-gold-muted'
            : 'border-tactical-grey-400 hover:border-tactical-grey-400'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileInputChange}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="space-y-4">
          <div className="flex justify-center">
            <Upload className="w-12 h-12 text-gray-400" />
          </div>

          <div>
            <p className="text-lg font-medium text-tactical-grey-800 mb-2">
              Upload Conversation File
            </p>
            <p className="text-sm text-tactical-grey-500">
              Drop your SMS export file here or click to browse
            </p>
          </div>

          <div className="text-xs text-gray-400">
            <p>Supported formats: {acceptedFormats.join(', ')}</p>
            <p>Maximum file size: {formatFileSize(maxFileSize)}</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-red-800">Upload Error</h4>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* File Selection Display */}
      {selectedFile && (
        <div className="flex items-center justify-between p-4 bg-tactical-grey-100 border border-tactical-grey-300 rounded-lg">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-tactical-grey-500" />
            <div>
              <p className="font-medium text-tactical-grey-800">{selectedFile.name}</p>
              <p className="text-sm text-tactical-grey-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isUploading && !uploadResult && (
              <button
                onClick={handleUpload}
                className="px-4 py-2 bg-tactical-gold text-white rounded-md hover:bg-tactical-gold-dark transition-colors"
              >
                Process File
              </button>
            )}
            
            <button
              onClick={clearSelection}
              disabled={isUploading}
              className="p-2 text-gray-400 hover:text-tactical-grey-500 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Progress Display */}
      {currentProgress && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStageIcon(currentProgress.stage)}
              <div>
                <p className="font-medium text-tactical-grey-800">
                  Processing for {clientName}
                </p>
                <p className="text-sm text-tactical-grey-500">{currentProgress.message}</p>
              </div>
            </div>
            
            {currentProgress.progress >= 0 && (
              <span className="text-sm font-medium text-tactical-grey-600">
                {currentProgress.progress}%
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {currentProgress.progress >= 0 && (
            <div className="w-full bg-tactical-grey-300 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(currentProgress.stage)}`}
                style={{ width: `${currentProgress.progress}%` }}
              />
            </div>
          )}

          {/* Progress Details */}
          {currentProgress.details && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {currentProgress.details.totalRows && (
                <div className="text-center">
                  <p className="font-medium text-tactical-grey-800">{currentProgress.details.totalRows}</p>
                  <p className="text-tactical-grey-500">Total Rows</p>
                </div>
              )}
              
              {currentProgress.details.recoveredRows !== undefined && (
                <div className="text-center">
                  <p className="font-medium text-tactical-grey-800">{currentProgress.details.recoveredRows}</p>
                  <p className="text-tactical-grey-500">Recovered</p>
                </div>
              )}
              
              {currentProgress.details.extractedMessages && (
                <div className="text-center">
                  <p className="font-medium text-tactical-grey-800">{currentProgress.details.extractedMessages}</p>
                  <p className="text-tactical-grey-500">Messages</p>
                </div>
              )}
              
              {currentProgress.details.errors && currentProgress.details.errors.length > 0 && (
                <div className="text-center">
                  <p className="font-medium text-red-600">{currentProgress.details.errors.length}</p>
                  <p className="text-tactical-grey-500">Errors</p>
                </div>
              )}
            </div>
          )}

          {/* Warnings and Errors */}
          {currentProgress.details?.warnings && currentProgress.details.warnings.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h5 className="font-medium text-yellow-800 mb-1">Warnings:</h5>
              <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                {currentProgress.details.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {currentProgress.details?.errors && currentProgress.details.errors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <h5 className="font-medium text-red-800 mb-1">Errors:</h5>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {currentProgress.details.errors.slice(0, 5).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {currentProgress.details.errors.length > 5 && (
                  <li className="text-red-600">
                    ...and {currentProgress.details.errors.length - 5} more errors
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Success Result */}
      {uploadResult && uploadResult.success && currentProgress?.stage === 'complete' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-green-800">Upload Successful!</h4>
              {uploadResult.conversation && (
                <div className="mt-2 text-sm text-green-700">
                  <p><strong>Conversation:</strong> {uploadResult.conversation.title}</p>
                  <p><strong>Messages:</strong> {uploadResult.conversation.messageCount}</p>
                </div>
              )}
              
              {uploadResult.processing && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-2 rounded border">
                    <p className="font-medium">Processing Summary</p>
                    <p>Confidence: {Math.round(uploadResult.processing.summary.confidenceAverage * 100)}%</p>
                  </div>
                  
                  {uploadResult.processing.corruption && (
                    <div className="bg-white p-2 rounded border">
                      <p className="font-medium">Data Recovery</p>
                      <p>Recovered: {uploadResult.processing.corruption.recoveredRows || 0} rows</p>
                    </div>
                  )}
                  
                  <div className="bg-white p-2 rounded border">
                    <p className="font-medium">Text Processing</p>
                    <p>Cleaned and formatted</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}