import { useCapture } from '../../hooks/useCapture';
import { useCaptureStore } from '../../stores/captureStore';

interface CaptureButtonProps {
  source?: 'webcam' | 'screen_share';
}

export function CaptureButton({ source = 'webcam' }: CaptureButtonProps) {
  const { startCapture, stopCapture } = useCapture();
  const status = useCaptureStore((s) => s.status);

  const isCapturing = status === 'capturing';
  const isProcessing = status === 'processing';
  const disabled = isProcessing;

  function handleClick() {
    if (isCapturing) {
      stopCapture();
    } else {
      startCapture(source);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label={isCapturing ? 'Stop capture' : 'Start capture'}
      className={`rounded-full w-16 h-16 border-none text-[24px] flex items-center justify-center text-text-primary transition-all duration-150 ${isCapturing ? 'bg-error-solid shadow-[0_0_0_6px_rgba(239,68,68,0.25),0_4px_16px_rgba(239,68,68,0.2)]' : 'bg-primary shadow-[0_4px_16px_rgba(251,191,36,0.3),0_2px_8px_rgba(0,0,0,0.1)]'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'opacity-100 cursor-pointer'}`}
    >
      {isProcessing ? '⏳' : isCapturing ? '⏹' : '⏺'}
    </button>
  );
}
