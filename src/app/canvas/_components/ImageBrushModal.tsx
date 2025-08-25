'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, Brush, Eraser, RotateCcw, Loader2, Sliders, ArrowRight, Upload, Download, RefreshCw } from 'lucide-react'
import type { ImageBrushModalState, BrushTool, CanvasMouseEvent } from '@/shared/types/image-brush'
import { 
  ProgressCalculator
} from '@/lib/utils/generation-progress'
import { useErrorHandler as useGenerationErrorHandler } from '@/lib/generation/error-handler'

interface ImageBrushModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  onComplete: (brushedImageUrl: string) => void
}

export function ImageBrushModal({
  isOpen,
  onClose,
  imageUrl,
  onComplete
}: ImageBrushModalProps) {
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  
  // State
  const [state, setState] = useState<ImageBrushModalState>({
    isOpen,
    isProcessing: false,
    currentTool: 'brush',
    brushSettings: {
      size: 40,
      opacity: 1,
      hardness: 0.8,
      color: '#FF0000'  // 기본값 빨간색
    },
    prompt: '',
    mode: 'flux', // 기본값을 flux로 변경
    progress: 0,
    error: null,
    referenceImage: null,
    styleStrength: 1.0
  })
  
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null)
  const referenceInputRef = useRef<HTMLInputElement>(null)

  // 자동 모드 선택 로직
  useEffect(() => {
    // 참조 이미지가 있으면 I2I 모드, 없으면 FLUX 모드
    const newMode = state.referenceImage ? 'i2i' : 'flux'
    if (state.mode !== newMode) {
      setState(prev => ({ ...prev, mode: newMode }))
    }
  }, [state.referenceImage, state.mode])

  // Load image and initialize canvas
  useEffect(() => {
    if (!isOpen || !imageUrl) return

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      
      // Set canvas size (max 1024px)
      const maxSize = 1024
      let width = img.width
      let height = img.height
      
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height)
        width *= ratio
        height *= ratio
      }
      
      
      // Draw image on main canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          canvasRef.current.width = width
          canvasRef.current.height = height
          ctx.drawImage(img, 0, 0, width, height)
        }
      }
      
      // Initialize mask canvas
      if (maskCanvasRef.current) {
        maskCanvasRef.current.width = width
        maskCanvasRef.current.height = height
        const maskCtx = maskCanvasRef.current.getContext('2d')
        if (maskCtx) {
          maskCtx.fillStyle = 'black'
          maskCtx.fillRect(0, 0, width, height)
        }
      }
      
      // Initialize preview canvas
      if (previewCanvasRef.current) {
        previewCanvasRef.current.width = width
        previewCanvasRef.current.height = height
      }
    }
    
    img.src = imageUrl
  }, [isOpen, imageUrl])

  // 마우스 위치 계산
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): CanvasMouseEvent => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0, isDrawing: false }
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      isDrawing
    }
  }, [isDrawing])

  // 미리보기 업데이트 (마스크 오버레이)
  const updatePreview = useCallback(() => {
    const canvas = canvasRef.current
    const maskCanvas = maskCanvasRef.current
    if (!canvas || !maskCanvas || !imageRef.current) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Redraw original image
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height)
    
    // 마스크 오버레이
    ctx.globalAlpha = 1
    ctx.fillStyle = state.brushSettings.color
    
    const maskCtx = maskCanvas.getContext('2d')
    if (maskCtx) {
      const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = maskCanvas.width
      tempCanvas.height = maskCanvas.height
      const tempCtx = tempCanvas.getContext('2d')
      
      if (tempCtx) {
        const overlayData = tempCtx.createImageData(maskCanvas.width, maskCanvas.height)
        
        // hex 색상을 RGB로 변환
        const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : { r: 255, g: 0, b: 0 }  // 기본값 빨간색
        }
        
        const rgb = hexToRgb(state.brushSettings.color)
        
        for (let i = 0; i < maskData.data.length; i += 4) {
          if (maskData.data[i] > 0) { // 흰색 부분만
            overlayData.data[i] = rgb.r       // R
            overlayData.data[i + 1] = rgb.g   // G
            overlayData.data[i + 2] = rgb.b   // B
            overlayData.data[i + 3] = 128     // A (반투명)
          }
        }
        
        tempCtx.putImageData(overlayData, 0, 0)
        ctx.drawImage(tempCanvas, 0, 0)
      }
    }
    
    ctx.globalAlpha = 1
  }, [state.brushSettings.color])

  // 마스크 그리기 - 연속적인 선 그리기
  const drawMask = useCallback((x: number, y: number, isNewStroke: boolean = false) => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return
    
    const ctx = maskCanvas.getContext('2d')
    if (!ctx) return
    
    const { size } = state.brushSettings
    
    // Set stroke properties based on tool
    if (state.currentTool === 'brush') {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = 'white'
      ctx.fillStyle = 'white'
    } else if (state.currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = 'black'
      ctx.fillStyle = 'black'
    }
    
    ctx.lineWidth = size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    // Draw continuous line from last position
    if (lastPos && !isNewStroke) {
      ctx.beginPath()
      ctx.moveTo(lastPos.x, lastPos.y)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
    
    // Always draw a circle at current position for better coverage
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.fill()
    
    // Update last position
    setLastPos({ x, y })
    
    // 미리보기 업데이트
    updatePreview()
  }, [state.brushSettings, state.currentTool, lastPos, updatePreview])

  // 브러쉬 프리뷰 그리기
  const drawBrushPreview = useCallback((x: number, y: number) => {
    const previewCanvas = previewCanvasRef.current
    if (!previewCanvas) return
    
    const ctx = previewCanvas.getContext('2d')
    if (!ctx) return
    
    // Clear previous preview
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
    
    // Draw brush preview circle
    const { size } = state.brushSettings
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)'  // 반투명 회색
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.stroke()
    
    // Draw crosshair at center
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.8)'  // 더 진한 회색
    ctx.lineWidth = 1
    const crosshairSize = 10  // 고정 크기
    
    // Horizontal line
    ctx.beginPath()
    ctx.moveTo(x - crosshairSize, y)
    ctx.lineTo(x + crosshairSize, y)
    ctx.stroke()
    
    // Vertical line
    ctx.beginPath()
    ctx.moveTo(x, y - crosshairSize)
    ctx.lineTo(x, y + crosshairSize)
    ctx.stroke()
  }, [state.brushSettings])

  // 마우스 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const pos = getMousePos(e)
    drawMask(pos.x, pos.y, true) // isNewStroke = true
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e)
    drawBrushPreview(pos.x, pos.y)  // 브러쉬 프리뷰 업데이트
    
    if (isDrawing) {
      drawMask(pos.x, pos.y, false) // isNewStroke = false
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
    setLastPos(null) // Reset last position when stroke ends
  }

  const handleMouseLeave = () => {
    setIsDrawing(false)
    setLastPos(null) // Reset last position when mouse leaves
    
    // Clear brush preview
    const previewCanvas = previewCanvasRef.current
    if (previewCanvas) {
      const ctx = previewCanvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
      }
    }
  }

  // Tool selection
  const selectTool = (tool: BrushTool) => {
    if (tool === 'clear') {
      // Reset mask
      const maskCanvas = maskCanvasRef.current
      if (maskCanvas) {
        const ctx = maskCanvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = 'black'
          ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
          updatePreview()
        }
      }
    } else {
      setState(prev => ({ ...prev, currentTool: tool }))
    }
  }

  // Change brush size
  const handleBrushSizeChange = (value: number[]) => {
    setState(prev => ({
      ...prev,
      brushSettings: {
        ...prev.brushSettings,
        size: value[0]
      }
    }))
  }

  // Handle reference image upload
  const handleReferenceUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      setState(prev => ({ ...prev, error: 'Please upload an image file.' }))
      return
    }
    
    const reader = new FileReader()
    reader.onload = (event) => {
      setState(prev => ({ 
        ...prev, 
        referenceImage: event.target?.result as string,
        error: null 
      }))
    }
    reader.readAsDataURL(file)
  }, [])
  
  // Handle reference image drag and drop
  const handleReferenceDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) {
      setState(prev => ({ ...prev, error: 'Please drop an image file.' }))
      return
    }
    
    const reader = new FileReader()
    reader.onload = (event) => {
      setState(prev => ({ 
        ...prev, 
        referenceImage: event.target?.result as string,
        error: null 
      }))
    }
    reader.readAsDataURL(file)
  }, [])
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // Error handler
  const { handleError, createErrorMessage } = useGenerationErrorHandler('image');
  
  // Progress calculator ref
  const progressCalculatorRef = useRef<ProgressCalculator | null>(null);

  // AI processing request
  const handleGenerate = async () => {
    // Validation - 현재 모드에 따른 검증
    if (state.mode === 'flux' && !state.prompt.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a prompt for FLUX mode.' }))
      return
    }
    
    if (state.mode === 'i2i' && !state.referenceImage) {
      setState(prev => ({ ...prev, error: 'Please upload a reference image for I2I mode.' }))
      return
    }

    // 즉시 UI 반응 (1%에서 시작)
    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      error: null,
      progress: 1  // 즉시 1%로 시작
    }))
    
    // Progress calculator 초기화
    progressCalculatorRef.current = new ProgressCalculator(
      { 
        mode: state.mode === 'flux' ? 'fast' : 'slow',
        expectedDuration: state.mode === 'flux' ? 80 : 180
      },
      (progress) => {
        setState(prev => ({ ...prev, progress }));
      }
    );
    
    // 즉시 progress 시작
    progressCalculatorRef.current.start();

    try {
      // Convert image and mask to Base64
      const canvas = canvasRef.current
      const maskCanvas = maskCanvasRef.current
      
      if (!canvas || !maskCanvas || !imageRef.current) {
        throw new Error('Failed to initialize canvas.')
      }

      // Original image Base64 (without mask overlay)
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height
      const tempCtx = tempCanvas.getContext('2d')
      if (tempCtx) {
        tempCtx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height)
      }
      const imageBase64 = tempCanvas.toDataURL('image/png')

      // 마스크 Base64
      const maskBase64 = maskCanvas.toDataURL('image/png')

      // 자동 progress 업데이트 시작
      const progressInterval = setInterval(() => {
        progressCalculatorRef.current?.autoUpdate();
      }, 1000);

      // API 호출
      const requestBody: {
        image: string;
        mask: string;
        prompt: string;
        mode: 'flux' | 'i2i';
        referenceImage?: string;
        styleStrength?: number;
      } = {
        image: imageBase64,
        mask: maskBase64,
        prompt: state.prompt,
        mode: state.mode
      }
      
      // Add I2I specific fields
      if (state.mode === 'i2i' && state.referenceImage) {
        requestBody.referenceImage = state.referenceImage
        requestBody.styleStrength = state.styleStrength
      }
      
      const response = await fetch('/api/canvas/image-brush', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        // 통합 에러 처리 사용
        const error = handleError(new Error(`HTTP ${response.status}`), {
          httpStatus: response.status,
          jobId: 'image-brush-' + Date.now()
        });
        throw error;
      }

      const result = await response.json()
      
      // 완료 애니메이션 실행 (90% -> 100%)
      progressCalculatorRef.current?.complete(() => {
        setState(prev => ({ 
          ...prev, 
          isProcessing: false 
        }));
        
        // Update result image
        if (result.imageUrl) {
          setResultImage(result.imageUrl);
        }
      });

    } catch (error) {
      // Progress calculator cleanup
      progressCalculatorRef.current?.destroy();
      
      // 통합 에러 처리
      const processedError = error instanceof Error ? handleError(error) : handleError(new Error(String(error)));
      const errorMessage = createErrorMessage(processedError);
      
      console.error('Image brush error:', processedError)
      setState(prev => ({ 
        ...prev, 
        error: errorMessage.message,
        isProcessing: false,
        progress: 0
      }))
    }
  }
  
  // Apply result and close modal
  const handleApplyResult = () => {
    if (resultImage) {
      onComplete(resultImage)
      onClose()
    }
  }
  
  // Reset everything
  const handleReset = () => {
    setResultImage(null)
    setState(prev => ({ ...prev, progress: 0, error: null }))
    // Reset mask
    const maskCanvas = maskCanvasRef.current
    if (maskCanvas) {
      const ctx = maskCanvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
        updatePreview()
      }
    }
  }
  
  // Download result image
  const handleDownloadResult = async () => {
    if (!resultImage) return
    
    try {
      // Fetch the image
      const response = await fetch(resultImage)
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `voguedrop-image-brush-${Date.now()}.png`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      setState(prev => ({ ...prev, error: 'Failed to download image' }))
    }
  }

  if (!isOpen) return null

  return (
    <>
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #38f47cf9;
          cursor: pointer;
          border-radius: 50%;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #38f47cf9;
          cursor: pointer;
          border: none;
          border-radius: 50%;
        }
        
        /* Custom Scrollbar Styles */
        .scrollbar-custom::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-custom::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 3px;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 3px;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* Main Modal with integrated Before/After */}
      <div className="bg-gray-800 rounded-xl w-full max-w-[1400px] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2 border-b border-gray-700">
          <h2 className="text-xl font-medium text-white">Image Brush - AI Image Editor</h2>
          <button
            className="text-gray-400 hover:text-gray-300 transition-colors"
            onClick={onClose}
            disabled={state.isProcessing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Before/After Container */}
          <div className="flex-1 flex">
            {/* Before Section */}
            <div className="flex-1 flex flex-col border-r border-gray-700">
              <div className="px-4 py-2 bg-gray-700 border-b border-gray-600">
                <h3 className="text-sm font-medium text-gray-300 text-center">Before (Edit Mask)</h3>
              </div>
              <div className="flex-1 p-4 flex items-center justify-center bg-gray-900/50">
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    className="border border-gray-600 rounded cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      maxWidth: '100%',
                      maxHeight: 'calc(95vh - 200px)'
                    }}
                  />
                  <canvas
                    ref={previewCanvasRef}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 'calc(95vh - 200px)'
                    }}
                  />
                  <canvas
                    ref={maskCanvasRef}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Arrow Indicator */}
            <div className="flex items-center justify-center px-2 bg-gray-900/30">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* After Section */}
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-2 bg-gray-700 border-b border-gray-600">
                <h3 className="text-sm font-medium text-gray-300 text-center">After (AI Result)</h3>
              </div>
              <div className="flex-1 p-4 flex items-center justify-center bg-gray-900/50">
                {resultImage ? (
                  <div className="relative max-w-full max-h-[calc(95vh-200px)]">
                    {/* Download button overlay */}
                    <button
                      onClick={handleDownloadResult}
                      className="absolute top-2 right-2 z-10 p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg transition-all duration-200 backdrop-blur-sm"
                      title="Download result"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    
                    <Image 
                      src={resultImage} 
                      alt="AI Generated Result" 
                      width={512}
                      height={512}
                      className="object-contain rounded border border-gray-600"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 'calc(95vh - 200px)',
                        width: 'auto',
                        height: 'auto'
                      }}
                      unoptimized // AI 생성 이미지는 최적화 스킵
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center mb-3">
                      <Loader2 className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-sm">AI result will appear here</p>
                    <p className="text-xs mt-1 opacity-70">Draw mask and generate to see results</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tools Panel */}
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden">
            {/* Scrollable Content Area */}
            <div className="flex-1 p-4 overflow-y-auto scrollbar-custom flex flex-col gap-3" style={{ maxHeight: 'calc(90vh - 4rem)' }}>
            {/* Tool Selection */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Tools</h3>
              <div className="flex gap-2">
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${
                    state.currentTool === 'brush' 
                      ? 'text-black hover:opacity-90' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  style={state.currentTool === 'brush' ? { backgroundColor: '#38f47cf9' } : {}}
                  onClick={() => selectTool('brush')}
                  disabled={state.isProcessing}
                >
                  <Brush className="w-4 h-4 mr-1" />
                  Brush
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${
                    state.currentTool === 'eraser' 
                      ? 'text-black hover:opacity-90' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  style={state.currentTool === 'eraser' ? { backgroundColor: '#38f47cf9' } : {}}
                  onClick={() => selectTool('eraser')}
                  disabled={state.isProcessing}
                >
                  <Eraser className="w-4 h-4 mr-1" />
                  Eraser
                </button>
                <button
                  className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  onClick={() => selectTool('clear')}
                  disabled={state.isProcessing}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Clear
                </button>
              </div>
            </div>

            {/* Brush Settings */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Brush Color</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={state.brushSettings.color}
                    onChange={(e) => setState(prev => ({ 
                      ...prev, 
                      brushSettings: { 
                        ...prev.brushSettings, 
                        color: e.target.value 
                      } 
                    }))}
                    disabled={state.isProcessing}
                    className="w-12 h-8 border border-gray-600 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-400">{state.brushSettings.color}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Brush Size</h3>
              <div className="flex items-center gap-3">
                <Sliders className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  value={state.brushSettings.size}
                  onChange={(e) => handleBrushSizeChange([parseInt(e.target.value)])}
                  min={5}
                  max={100}
                  step={5}
                  disabled={state.isProcessing}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #38f47cf9 0%, #38f47cf9 ${((state.brushSettings.size - 5) / 95) * 100}%, #374151 ${((state.brushSettings.size - 5) / 95) * 100}%, #374151 100%)`
                  }}
                />
                <span className="text-sm text-gray-400 w-10 text-right">
                  {state.brushSettings.size}px
                </span>
              </div>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Prompt</h3>
              <textarea
                className="w-full h-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                placeholder="Describe how to modify the masked area.\nExample: expand t-shirt part, add floral pattern"
                value={state.prompt}
                onChange={(e) => setState(prev => ({ ...prev, prompt: e.target.value }))}
                disabled={state.isProcessing}
              />
            </div>

            {/* Reference Image Upload */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Reference Image <span className="text-xs text-gray-500">(Optional)</span></h3>
              <div 
                className="border-2 border-dashed border-gray-600 rounded-lg p-2 text-center cursor-pointer hover:border-gray-500 transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleReferenceDrop}
                onClick={() => referenceInputRef.current?.click()}
              >
                {state.referenceImage ? (
                  <div className="relative">
                    <Image 
                      src={state.referenceImage} 
                      alt="Reference" 
                      width={60} 
                      height={60}
                      className="mx-auto rounded object-cover"
                      style={{ maxHeight: '60px', width: 'auto' }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setState(prev => ({ ...prev, referenceImage: null }));
                      }}
                      className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-400 py-2">
                    <Upload className="w-5 h-5 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">Upload style image</p>
                  </div>
                )}
              </div>
              <input
                ref={referenceInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReferenceUpload}
              />
              
              {/* Style Strength Slider */}
              {state.referenceImage && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Style Strength</span>
                    <span className="text-xs text-gray-400">{state.styleStrength?.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    value={state.styleStrength || 1.0}
                    onChange={(e) => setState(prev => ({ 
                      ...prev, 
                      styleStrength: parseFloat(e.target.value) 
                    }))}
                    min={0.5}
                    max={1.5}
                    step={0.1}
                    disabled={state.isProcessing}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #38f47cf9 0%, #38f47cf9 ${((state.styleStrength || 1.0) - 0.5) * 100}%, #374151 ${((state.styleStrength || 1.0) - 0.5) * 100}%, #374151 100%)`
                    }}
                  />
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Weak</span>
                    <span>Strong</span>
                  </div>
                </div>
              )}
              
              {/* Generate Button */}
              <button
                className="w-full px-4 py-2.5 text-black rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{ backgroundColor: '#38f47cf9' }}
                onClick={handleGenerate}
                disabled={
                  state.isProcessing || 
                  (state.mode === 'flux' && !state.prompt.trim()) ||
                  (state.mode === 'i2i' && !state.referenceImage)
                }
              >
                {state.isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : resultImage ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate with AI
                  </>
                ) : (
                  'Apply Style with AI'
                )}
              </button>
            </div>

            {/* Error Message */}
            {state.error && (
              <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-400">
                {state.error}
              </div>
            )}

            {/* Progress Bar */}
            {state.isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>
                    {state.progress < 30 
                      ? 'Initializing AI model...' 
                      : 'Processing...'}
                  </span>
                  <span>{state.progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ width: `${state.progress}%`, backgroundColor: '#38f47cf9' }}
                  />
                </div>
                {state.progress < 30 && (
                  <p className="text-xs text-gray-500">
                    First request may take 30-60 seconds to warm up the model
                  </p>
                )}
              </div>
            )}

            {/* Apply/Reset Buttons (show when result exists) */}
            {resultImage && (
              <div className="flex gap-2">
                <button
                  onClick={handleApplyResult}
                  className="flex-1 px-4 py-2 text-black rounded-lg font-medium hover:opacity-90 transition-all"
                  style={{ backgroundColor: '#38f47cf9' }}
                >
                  Apply Result
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Reset
                </button>
              </div>
            )}

            {/* Instructions */}
            <div className="text-xs text-gray-500">
              <p>• Draw mask → Enter prompt or upload style image → Generate</p>
            </div>
          </div>
        </div>
        </div>
      </div>
      </div>
    </>
  )
}