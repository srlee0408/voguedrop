'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, Brush, Eraser, RotateCcw, Loader2, Sliders, ArrowRight } from 'lucide-react'
import type { ImageBrushModalState, BrushTool, CanvasMouseEvent } from '@/types/image-brush'

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
  const imageRef = useRef<HTMLImageElement | null>(null)
  
  // State
  const [state, setState] = useState<ImageBrushModalState>({
    isOpen,
    isProcessing: false,
    currentTool: 'brush',
    brushSettings: {
      size: 40,
      opacity: 1,
      hardness: 0.8
    },
    prompt: '',
    mode: 'flux',
    progress: 0,
    error: null
  })
  
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null)

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
    
    // 마스크 오버레이 (반투명 빨간색)
    ctx.globalAlpha = 0.5
    ctx.fillStyle = 'red'
    
    const maskCtx = maskCanvas.getContext('2d')
    if (maskCtx) {
      const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = maskCanvas.width
      tempCanvas.height = maskCanvas.height
      const tempCtx = tempCanvas.getContext('2d')
      
      if (tempCtx) {
        const overlayData = tempCtx.createImageData(maskCanvas.width, maskCanvas.height)
        
        for (let i = 0; i < maskData.data.length; i += 4) {
          if (maskData.data[i] > 0) { // 흰색 부분만
            overlayData.data[i] = 255     // R
            overlayData.data[i + 1] = 0   // G
            overlayData.data[i + 2] = 0   // B
            overlayData.data[i + 3] = 128 // A (반투명)
          }
        }
        
        tempCtx.putImageData(overlayData, 0, 0)
        ctx.drawImage(tempCanvas, 0, 0)
      }
    }
    
    ctx.globalAlpha = 1
  }, [])

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

  // 마우스 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const pos = getMousePos(e)
    drawMask(pos.x, pos.y, true) // isNewStroke = true
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const pos = getMousePos(e)
    drawMask(pos.x, pos.y, false) // isNewStroke = false
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
    setLastPos(null) // Reset last position when stroke ends
  }

  const handleMouseLeave = () => {
    setIsDrawing(false)
    setLastPos(null) // Reset last position when mouse leaves
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

  // AI processing request
  const handleGenerate = async () => {
    if (!state.prompt.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a prompt.' }))
      return
    }

    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      error: null,
      progress: 0 
    }))

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

      // 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setState(prev => ({ 
          ...prev, 
          progress: Math.min(prev.progress + 10, 90) 
        }))
      }, 500)

      // API 호출
      const response = await fetch('/api/canvas/image-brush', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64,
          mask: maskBase64,
          prompt: state.prompt,
          mode: state.mode
        })
      })

      if (!response.ok) {
        clearInterval(progressInterval)
        const errorData = await response.json()
        throw new Error(errorData.error || 'An error occurred during processing.')
      }

      const result = await response.json()
      clearInterval(progressInterval)
      
      // Debug: Log all returned URLs
      console.log('Image Brush Result:', {
        resultUrl: result.imageUrl,
        originalUrl: result.originalImageUrl,
        maskUrl: result.maskImageUrl
      })
      
      setState(prev => ({ 
        ...prev, 
        progress: 100,
        isProcessing: false 
      }))
      
      // Update result image
      if (result.imageUrl) {
        setResultImage(result.imageUrl)
      }

    } catch (error) {
      console.error('Image brush error:', error)
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'An error occurred during processing.',
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
      `}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* Main Modal with integrated Before/After */}
      <div className="bg-gray-800 rounded-xl w-full max-w-[1400px] max-h-[90vh] flex flex-col">
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
                      maxHeight: 'calc(90vh - 250px)'
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
                  <div className="relative max-w-full max-h-[calc(90vh-250px)]">
                    <Image 
                      src={resultImage} 
                      alt="AI Generated Result" 
                      width={512}
                      height={512}
                      className="object-contain rounded border border-gray-600"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 'calc(90vh - 250px)',
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
          <div className="w-80 p-4 bg-gray-800 border-l border-gray-700 flex flex-col gap-4">
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

            {/* Mode Selection */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Processing Mode</h3>
              <select
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                value={state.mode}
                onChange={(e) => setState(prev => ({ ...prev, mode: e.target.value as 'flux' | 'i2i' }))}
                disabled={state.isProcessing}
              >
                <option value="flux">Image Modification</option>
                <option value="i2i" disabled>Image Transform(coming soon)</option>
              </select>
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
                  <span>Processing...</span>
                  <span>{state.progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ width: `${state.progress}%`, backgroundColor: '#38f47cf9' }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Generate Button */}
              <button
                className="w-full px-4 py-2.5 text-black rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{ backgroundColor: '#38f47cf9' }}
                onClick={handleGenerate}
                disabled={state.isProcessing || !state.prompt.trim()}
              >
                {state.isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Generate with AI'
                )}
              </button>

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
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-500 space-y-1 mt-auto">
              <p>• Mark the areas to modify with the brush</p>
              <p>• Red areas indicate where AI will make changes</p>
              <p>• English prompts provide more accurate results</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}